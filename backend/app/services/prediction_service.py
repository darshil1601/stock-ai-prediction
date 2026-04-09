"""
prediction_service.py - Multi-symbol LSTM prediction pipeline
"""
from __future__ import annotations

from datetime import datetime

import logging
import threading
import numpy as np
import pandas as pd

from app import cache as redis_cache
from app.database import get_average_accuracy
from app.services.asset_profile import get_asset_profile, next_trading_day
from app.services.db_service import get_sentiment_summary, symbol_to_summary_key
from app.services.feature_engineering import add_features
from app.services.event_service import max_event_tier
from app.services.market_intelligence import compute_market_confidence, detect_volatility_event
from app.services.model_loader import get_model, get_scaler, is_model_ready
from app.services.twelve_fetcher import fetch_historical_data

WINDOW = 60
FUTURE_DAYS = 1
FEATURES = [
    "close", "returns",
    "sma_20", "ema_9", "ema_21",
    "macd", "macd_signal", "macd_hist",
    "volatility_20", "rsi_14",
    "bb_upper", "bb_lower", "bb_width", "bb_pct",
    "atr_pct",
    "roc_5", "roc_10",
    "lag_1", "lag_2", "lag_3", "lag_4", "lag_5",
]


logger = logging.getLogger(__name__)

# Global locks to prevent multiple simultaneous predictions for the same symbol
PREDICTION_LOCKS: dict[str, threading.Lock] = {}

def get_prediction_lock(symbol: str) -> threading.Lock:
    if symbol not in PREDICTION_LOCKS:
        PREDICTION_LOCKS[symbol] = threading.Lock()
    return PREDICTION_LOCKS[symbol]


def _fetch_and_prepare(symbol: str, rows: int = 500) -> pd.DataFrame:
    """Fetch from Twelve Data, apply features, drop NaN."""
    df = fetch_historical_data(symbol, outputsize=rows)
    df = add_features(df)
    df.dropna(inplace=True)
    return df


def _predict_next_return(symbol: str, df: pd.DataFrame) -> float:
    """Run symbol-specific LSTM on the last WINDOW rows and predict next-day return."""
    scaler = get_scaler(symbol)
    model = get_model(symbol)

    data = df[FEATURES].values
    scaled = scaler.transform(data)

    X = scaled[-WINDOW:].reshape(1, WINDOW, len(FEATURES))
    pred_scaled = float(model.predict(X, verbose=0)[0][0])

    # MinMaxScaler works feature-wise, so a zero-filled vector is safe here.
    dummy = np.zeros((1, len(FEATURES)))
    dummy[0, 1] = pred_scaled
    inv = scaler.inverse_transform(dummy)
    pred_return = float(inv[0, 1])

    if not np.isfinite(pred_return):
        return 0.0
    return pred_return


def _stabilize_prediction(
    symbol: str,
    df: pd.DataFrame,
    raw_return: float,
    vol_event: dict,
    news_summary: dict | None,
) -> dict:
    """
    Blend the model output with recent market behaviour and cap the result
    by realized volatility so BTC and gold are handled on their own scale.
    Injects FinBERT news aggregate (sentiment_summary) when available.
    """
    profile = get_asset_profile(symbol)
    returns = df["returns"].dropna()
    
    # Use a longer window for volatility to avoid overreacting to single spikes
    vol_window = max(profile.medium_window, 25)
    recent_returns = returns.tail(vol_window)
    short_returns = recent_returns.tail(max(profile.short_window, 3))
    medium_returns = recent_returns
    
    short_baseline = float(short_returns.median()) if not short_returns.empty else 0.0
    medium_baseline = float(medium_returns.mean()) if not medium_returns.empty else short_baseline
    
    # Dynamic trend-following weight
    baseline_return = (0.70 * short_baseline) + (0.30 * medium_baseline)
    
    realized_volatility = float(recent_returns.std()) if len(recent_returns) > 1 else 1e-4
    if not np.isfinite(realized_volatility):
        realized_volatility = 1e-4

    sentiment_bias = 0.0
    if news_summary and int(news_summary.get("news_count") or 0) > 0:
        avg = float(news_summary.get("avg_sentiment") or 0.0)
        sentiment_bias = avg * realized_volatility * 0.35

    vol_cap_multi = profile.volatility_cap_multiplier
    if vol_event.get("is_event"):
        # Expand the volatility cap during actual market events, don't clip the big moves!
        vol_cap_multi = max(vol_cap_multi, vol_event.get("spike_ratio", 1.0) * 0.9)

    # Cap return based on asset profile volatility caps
    return_cap = realized_volatility * vol_cap_multi
    return_cap = min(profile.max_return_cap, max(profile.min_return_cap, return_cap))

    # Raw return from LSTM can be erratic; dampen it towards the trend baseline
    raw_return = 0.0 if not np.isfinite(raw_return) else float(raw_return)
    raw_return += sentiment_bias
    
    # Trust the LSTM more for accuracy! Lower volatility (Gold) has very little dampening.
    dampening = 0.90 if profile.asset_class == "crypto" else 1.0
    blended_return = (profile.model_weight * raw_return * dampening) + ((1.0 - profile.model_weight) * baseline_return)
    
    # Final clip
    adjusted_return = float(np.clip(blended_return, -return_cap, return_cap))

    return {
        "raw_return": raw_return,
        "baseline_return": baseline_return,
        "blended_return": blended_return,
        "adjusted_return": adjusted_return,
        "realized_volatility": realized_volatility,
        "return_cap": return_cap,
        "was_capped": abs(blended_return) > return_cap + 1e-9,
        "confidence_band_pct": min(
            profile.max_return_cap * 100.0,
            max(profile.min_signal_return * 100.0, return_cap * profile.confidence_band_multiplier * 100.0),
        ),
    }


def _resolve_signal(symbol: str, predicted_return: float, realized_volatility: float) -> tuple[str, float]:
    profile = get_asset_profile(symbol)
    # Signal threshold is now significantly more robust to volatility noise
    signal_threshold = max(profile.min_signal_return, realized_volatility * profile.signal_volatility_fraction)

    if predicted_return > signal_threshold:
        return "BUY", signal_threshold
    if predicted_return < -signal_threshold:
        return "SELL", signal_threshold
    return "HOLD", signal_threshold


def _estimate_base_confidence(stabilized: dict, historical_accuracy: float, signal_threshold: float) -> float:
    """
    Unified confidence scoring that normalizes move intensity across asset classes.
    """
    accuracy_score = float(np.clip(historical_accuracy / 100.0, 0.45, 0.95))
    realized_volatility = max(float(stabilized["realized_volatility"]), 1e-6)
    adjusted_return = float(stabilized["adjusted_return"])
    baseline_return = float(stabilized["baseline_return"])
    
    # Move ratio relative to signal threshold (Normalization anchor)
    move_strength = abs(adjusted_return) / max(signal_threshold, 1e-6)
    
    # Base confidence centered around accuracy
    base_confidence = 0.35 + (accuracy_score * 0.50)

    # Reward strong signals that align with trend, penalize extreme outliers
    if move_strength > 1.0:
        # Signal is strong (above threshold)
        if np.sign(adjusted_return) == np.sign(baseline_return):
            base_confidence += min(0.10, (move_strength - 1.0) * 0.05) # Alignment bonus
        else:
            base_confidence -= 0.10 # Contra-trend penalty
    else:
        # Weak signal (near HOLD zone)
        base_confidence -= 0.05

    # Penalize if it was capped (unrealistic move)
    if stabilized["was_capped"]:
        base_confidence -= 0.15

    # Clip to realistic range
    return round(float(np.clip(base_confidence, 0.30, 0.88)), 2)


def _build_payload(
    symbol: str,
    df: pd.DataFrame,
    future_returns: list[float],
    forecast_meta: dict,
    news_summary: dict | None,
) -> dict:
    profile = get_asset_profile(symbol)
    tail = df.tail(44).reset_index(drop=True)
    historical = [
        {"date": str(row["date"])[:10], "price": round(float(row["close"]), 4)}
        for _, row in tail.iterrows()
    ]

    last_close = float(df["close"].iloc[-1])
    last_date = datetime.strptime(str(df["date"].iloc[-1])[:10], "%Y-%m-%d").date()

    price = last_close
    total_ret = sum(future_returns)
    signal, signal_threshold = _resolve_signal(symbol, total_ret, float(forecast_meta["realized_volatility"]))

    # ── Date Intelligence: Resolve user confusion about 'skipping' today ──────
    today_utc = datetime.utcnow().date()
    is_live_session = (last_date == today_utc)
    
    status_label = "Confirmed (Post-Market)"
    if is_live_session:
        status_label = "Live (Current session active)"

    forecast = []
    next_pred_date = next_trading_day(symbol, last_date)
    for ret in future_returns:
        price = price * (1 + ret)
        forecast.append({"date": next_pred_date.strftime("%Y-%m-%d"), "price": round(price, 4)})
        next_pred_date = next_trading_day(symbol, next_pred_date)

    dyn_accuracy = get_average_accuracy(symbol)
    base_confidence = _estimate_base_confidence(forecast_meta, dyn_accuracy, signal_threshold)

    vol_event = detect_volatility_event(df)
    market_intel = compute_market_confidence(base_confidence, vol_event, news_summary)

    confidence = market_intel["adjusted_confidence"]
    market_alert = market_intel["market_alert"]

    if market_alert == "danger":
        try:
            from app.services.retrain_service import auto_retrain_enabled

            if auto_retrain_enabled():
                import threading
                from train_all import train_all_symbols

                threading.Thread(target=train_all_symbols, daemon=True).start()
                print(f"[AI-Self-Correction] CRITICAL EVENT — full retrain started for {symbol}.")
                market_intel["warnings"].append(
                    "AI Self-Correction active: refreshing models with the latest market regime."
                )
            else:
                market_intel["warnings"].append(
                    "Extreme volatility — enable ENABLE_AUTO_RETRAIN=1 for automatic model refresh."
                )
        except Exception as e:
            print(f"[AI-Self-Correction] Failed to trigger emergency retrain: {e}")

    base_volatility = max(
        float(df["volatility_20"].iloc[-1]) if "volatility_20" in df else 0.0,
        float(df["atr_pct"].iloc[-1]) if "atr_pct" in df else 0.0,
        profile.min_signal_return,
    )

    is_forex = profile.asset_class == "forex"
    atr_min = 0.0005 if is_forex else profile.min_signal_return
    atr = max(atr_min, base_volatility)

    if signal == "SELL":
        entry_low = round(last_close * (1 - atr * 0.2), 4)
        entry_high = round(last_close * (1 + atr * 0.5), 4)
        stop_loss = round(last_close * (1 + atr * 1.5), 4)
        target_1 = round(last_close * (1 - atr * 2.0), 4)
        target_2 = round(last_close * (1 - atr * 3.5), 4)
    elif signal == "HOLD":
        entry_low = round(last_close * (1 - atr * 0.3), 4)
        entry_high = round(last_close * (1 + atr * 0.3), 4)
        stop_loss = round(last_close * (1 - atr * 1.0), 4)
        target_1 = round(last_close * (1 + atr * 1.5), 4)
        target_2 = round(last_close * (1 + atr * 2.5), 4)
    else:
        entry_low = round(last_close * (1 - atr * 0.5), 4)
        entry_high = round(last_close * (1 + atr * 0.2), 4)
        stop_loss = round(last_close * (1 - atr * 1.5), 4)
        target_1 = round(last_close * (1 + atr * 2.0), 4)
        target_2 = round(last_close * (1 + atr * 3.5), 4)

    mid_entry = (entry_low + entry_high) / 2
    risk_pts = abs(mid_entry - stop_loss)
    reward_pts = abs(target_1 - mid_entry)
    risk_reward = round(reward_pts / risk_pts, 1) if risk_pts > 0 else 2.5

    scaled_vol = min(100, int((base_volatility / max(profile.max_return_cap, 1e-9)) * 100))
    risk_level = "High" if scaled_vol > 65 else "Medium" if scaled_vol > 35 else "Low"

    return {
        "symbol": symbol,
        "prediction_status": status_label,
        "historical": historical,
        "predicted": forecast,
        "next_price": round(forecast[0]["price"] if forecast else last_close, 4),
        "signal": signal,
        "confidence": confidence,
        "accuracy": dyn_accuracy,
        "model": "MomentumNet v2 (LSTM + calibration)",
        "forecast_meta": {
            "raw_return_pct": round(float(forecast_meta["raw_return"]) * 100, 3),
            "baseline_return_pct": round(float(forecast_meta["baseline_return"]) * 100, 3),
            "adjusted_return_pct": round(float(forecast_meta["adjusted_return"]) * 100, 3),
            "volatility_cap_pct": round(float(forecast_meta["return_cap"]) * 100, 3),
            "signal_threshold_pct": round(signal_threshold * 100, 3),
            "confidence_band_pct": round(float(forecast_meta["confidence_band_pct"]), 3),
            "trades_weekends": profile.trades_weekends,
            "asset_class": profile.asset_class,
        },
        "market_intelligence": {
            "market_alert": market_intel["market_alert"],
            "event_detected": market_intel["event_detected"],
            "spike_ratio": market_intel["spike_ratio"],
            "warnings": market_intel["warnings"],
            "current_move_pct": vol_event["current_move"],
            "avg_move_pct": vol_event["avg_move"],
            "sentiment_applied": market_intel["sentiment_applied"],
            "sentiment_score": market_intel["sentiment_score"],
            "sentiment_label": market_intel["sentiment_label"],
            "max_event": market_intel["max_event"],
            "news_count": market_intel["news_count"],
            "event_tier": max_event_tier(market_intel["max_event"]),
        },
        "entry_exit_zones": {
            "signal": signal,
            "signalZone": [entry_low, entry_high],
            "stopLoss": stop_loss,
            "target1": target_1,
            "target2": target_2,
            "riskReward": risk_reward,
        },
        "risk_metrics": {
            "volatility": scaled_vol,
            "aiConfidence": int(confidence * 100),
            "riskLevel": risk_level,
            "market_alert": market_intel["market_alert"],
            "event_detected": market_intel["event_detected"],
            "sentiment_score": market_intel["sentiment_score"],
            "sentiment_label": market_intel["sentiment_label"],
            "max_event": market_intel["max_event"],
            "event_tier": max_event_tier(market_intel["max_event"]),
            "news_count": market_intel["news_count"],
        },
        "generated_at": datetime.utcnow().isoformat(),
    }


def run_prediction(symbol: str = "XAU/USD") -> dict:
    lock = get_prediction_lock(symbol)
    with lock:
        return _run_prediction_locked(symbol)


def _run_prediction_locked(symbol: str = "XAU/USD") -> dict:
    cache_key = f"predict:{symbol.replace('/', '').lower()}"
    cached = redis_cache.get_prediction(cache_key)
    if cached:
        return cached

    if not is_model_ready(symbol):
        raise RuntimeError(f"LSTM model for {symbol} not trained yet.")

    df = _fetch_and_prepare(symbol, rows=500)
    if len(df) < WINDOW + 20:
        raise RuntimeError(f"Not enough data rows ({len(df)}) for {symbol}.")

    # ── Handle Partial Candles (The 'Skipping Dates' Fix) ─────────────────────
    # If the last row from Twelve Data is 'Today' (UTC), it's a partial candle.
    # We drop it to ensure we always predict 'Today' based on 'Yesterday's' close.
    # This prevents the system from skipping today and jumping to tomorrow.
    today_utc = datetime.utcnow().date()
    last_candle_date = datetime.strptime(str(df["date"].iloc[-1])[:10], "%Y-%m-%d").date()
    
    if last_candle_date == today_utc:
        logger.info(f"[{symbol}] Today's partial candle ({today_utc}) detected. Using Yesterday's close to predict Today.")
        df = df.iloc[:-1].copy()

    news_summary = get_sentiment_summary(symbol_to_summary_key(symbol))
    vol_event = detect_volatility_event(df)

    future_returns: list[float] = []
    working_df = df.copy()
    forecast_meta: dict | None = None

    for _ in range(FUTURE_DAYS):
        raw_return = _predict_next_return(symbol, working_df)
        step_meta = _stabilize_prediction(symbol, working_df, raw_return, vol_event, news_summary)
        adjusted_return = float(step_meta["adjusted_return"])
        future_returns.append(adjusted_return)

        if forecast_meta is None:
            forecast_meta = step_meta

        last = working_df.iloc[-1].copy()
        last_date = datetime.strptime(str(last["date"])[:10], "%Y-%m-%d").date()
        synthetic_open = float(last["close"])
        synthetic_close = synthetic_open * (1 + adjusted_return)

        last["date"] = next_trading_day(symbol, last_date).strftime("%Y-%m-%d")
        last["open"] = synthetic_open
        last["high"] = max(synthetic_open, synthetic_close)
        last["low"] = min(synthetic_open, synthetic_close)
        last["close"] = synthetic_close

        if "volume" in working_df.columns:
            volume_window = working_df["volume"].tail(20)
            last["volume"] = int(float(volume_window.median())) if not volume_window.empty else 0

        working_df = pd.concat([working_df, pd.DataFrame([last])], ignore_index=True)
        working_df = add_features(working_df)
        working_df.dropna(inplace=True)

    if forecast_meta is None:
        raise RuntimeError(f"Prediction calibration failed for {symbol}.")

    payload = _build_payload(symbol, df, future_returns, forecast_meta, news_summary)
    redis_cache.set_prediction(payload, key=cache_key)

    try:
        from app.database import reconcile_predictions, save_prediction, supabase, save_intelligence_log

        target_date = payload["predicted"][0]["date"] if payload["predicted"] else None
        if target_date:
            existing = (
                supabase.table("predictions")
                .select("id")
                .eq("symbol", symbol)
                .eq("predicted_for", target_date)
                .execute()
            )

            # 1. Log generic market sentiment (Intelligence History)
            mi = payload["market_intelligence"]
            nc = int(mi.get("news_count") or 0)
            score_0_100 = int(round((float(mi["sentiment_score"]) + 1.0) * 50.0)) if nc else 50
            score_0_100 = max(0, min(100, score_0_100))
            
            save_intelligence_log({
                "symbol": symbol,
                "fear_greed_score": score_0_100,
                "fear_greed_label": mi["sentiment_label"],
                "global_volatility_score": mi["spike_ratio"],
            })

            # Data to save/update
            prediction_record = {
                "symbol": symbol,
                "predicted_price": payload["next_price"],
                "confidence": payload["confidence"],
                "signal": payload["signal"],
                "predicted_for": target_date,
                "market_alert": payload["market_intelligence"]["market_alert"],
                "fear_greed_score": score_0_100,
                "volatility_ratio": payload["market_intelligence"]["spike_ratio"],
                "warnings": payload["market_intelligence"]["warnings"],
            }

            # 2. Check for existing UNRECONCILED prediction for this date
            existing = (
                supabase.table("predictions")
                .select("id")
                .eq("symbol", symbol)
                .eq("predicted_for", target_date)
                .execute()
            )

            if existing.data:
                # Discrepancy Fix: Update existing pending prediction instead of inserting new one.
                # Only update if it hasn't been reconciled yet.
                pred_id = existing.data[0]["id"]
                supabase.table("predictions") \
                    .update(prediction_record) \
                    .eq("id", pred_id) \
                    .is_("actual_price", "null") \
                    .execute()
                logger.info(f"[{symbol}] Updated existing prediction for {target_date}")
            else:
                # 3. Save new AI Prediction
                save_prediction(prediction_record)
                logger.info(f"[{symbol}] Saved new prediction for {target_date}")

    except Exception as e:
        logger.error(f"Error in Supabase record keeping ({symbol}): {e}")

    return payload
