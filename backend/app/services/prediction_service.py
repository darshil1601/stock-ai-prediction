"""
prediction_service.py - Multi-symbol LSTM prediction pipeline.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import logging
import threading

import numpy as np
import pandas as pd

from app import cache as redis_cache
from app.database import get_average_accuracy
from app.services.asset_profile import (
    format_prediction_target,
    get_asset_profile,
    is_partial_candle,
    next_prediction_timestamp,
    parse_candle_timestamp,
    serialize_candle_timestamp,
)
from app.services.db_service import get_sentiment_summary, symbol_to_summary_key
from app.services.event_service import max_event_tier
from app.services.feature_engineering import add_features
from app.services.market_intelligence import compute_market_confidence, detect_volatility_event
from app.services.model_loader import (
    get_loaded_version,
    get_model,
    get_scaler,
    get_latest_version,
    is_model_ready,
)
from app.services.training.retrain_service import wait_for_training
from app.services.twelve_fetcher import fetch_historical_data

WINDOW = 60
FUTURE_STEPS = 1
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

PREDICTION_LOCKS: dict[str, threading.Lock] = {}


def get_prediction_lock(symbol: str) -> threading.Lock:
    if symbol not in PREDICTION_LOCKS:
        PREDICTION_LOCKS[symbol] = threading.Lock()
    return PREDICTION_LOCKS[symbol]


def _history_row_budget(symbol: str) -> int:
    profile = get_asset_profile(symbol)
    return 1200 if profile.history_interval != "1day" else 500


def _fetch_and_prepare(symbol: str, rows: int | None = None) -> pd.DataFrame:
    """Fetch from Twelve Data, apply features, drop NaN."""
    df = fetch_historical_data(symbol, outputsize=rows or _history_row_budget(symbol))
    df = add_features(df)
    df.dropna(inplace=True)
    return df


def _predict_next_return(symbol: str, df: pd.DataFrame) -> float:
    """Run symbol-specific LSTM on the last WINDOW rows and predict next-step return."""
    scaler = get_scaler(symbol)
    model = get_model(symbol)

    data = df[FEATURES].values
    scaled = scaler.transform(data)

    X = scaled[-WINDOW:].reshape(1, WINDOW, len(FEATURES))
    pred_scaled = float(model.predict(X, verbose=0)[0][0])

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
    by realised volatility so each asset is handled on its own scale.
    """
    profile = get_asset_profile(symbol)
    returns = df["returns"].dropna()

    vol_window = max(profile.medium_window, 25)
    recent_returns = returns.tail(vol_window)
    short_returns = recent_returns.tail(max(profile.short_window, 3))
    medium_returns = recent_returns

    short_baseline = float(short_returns.median()) if not short_returns.empty else 0.0
    medium_baseline = float(medium_returns.mean()) if not medium_returns.empty else short_baseline
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
        event_boost = float(vol_event.get("spike_ratio", 1.0)) * 0.9
        vol_cap_multi = min(vol_cap_multi * 2.0, max(vol_cap_multi, event_boost))

    return_cap = realized_volatility * vol_cap_multi
    return_cap = min(profile.max_return_cap, max(profile.min_return_cap, return_cap))

    raw_return = 0.0 if not np.isfinite(raw_return) else float(raw_return)
    raw_return += sentiment_bias

    if profile.asset_class == "crypto":
        dampening = 0.75
    elif profile.asset_class == "forex":
        dampening = 0.95
    else:
        dampening = 1.0

    blended_return = (
        profile.model_weight * raw_return * dampening
    ) + ((1.0 - profile.model_weight) * baseline_return)
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
    signal_threshold = max(profile.min_signal_return, realized_volatility * profile.signal_volatility_fraction)

    if predicted_return > signal_threshold:
        return "BUY", signal_threshold
    if predicted_return < -signal_threshold:
        return "SELL", signal_threshold
    return "HOLD", signal_threshold


def _estimate_base_confidence(
    stabilized: dict,
    historical_accuracy: float | None,
    signal_threshold: float,
) -> float:
    """
    Confidence from current signal quality plus reconciled history when available.
    """
    realized_volatility = max(float(stabilized["realized_volatility"]), 1e-6)
    adjusted_return = float(stabilized["adjusted_return"])
    baseline_return = float(stabilized["baseline_return"])
    move_strength = abs(adjusted_return) / max(signal_threshold, 1e-6)

    if historical_accuracy is None:
        base_confidence = 0.44
    else:
        accuracy_score = float(np.clip(historical_accuracy / 100.0, 0.45, 0.95))
        base_confidence = 0.35 + (accuracy_score * 0.50)

    if move_strength > 1.0:
        if np.sign(adjusted_return) == np.sign(baseline_return):
            base_confidence += min(0.10, (move_strength - 1.0) * 0.05)
        else:
            base_confidence -= 0.08
    else:
        base_confidence -= 0.05

    if stabilized["was_capped"]:
        base_confidence -= 0.15

    if realized_volatility > 0.02:
        base_confidence -= 0.03

    return round(float(np.clip(base_confidence, 0.25, 0.88)), 2)


def _build_payload(
    symbol: str,
    df: pd.DataFrame,
    future_returns: list[float],
    forecast_meta: dict,
    news_summary: dict | None,
) -> dict:
    profile = get_asset_profile(symbol)
    tail_length = 48 if profile.history_interval != "1day" else 44
    tail = df.tail(tail_length).reset_index(drop=True)
    historical = [
        {"date": str(row["date"]), "price": round(float(row["close"]), 4)}
        for _, row in tail.iterrows()
    ]

    last_close = float(df["close"].iloc[-1])
    last_timestamp = parse_candle_timestamp(str(df["date"].iloc[-1]))

    price = last_close
    total_ret = sum(future_returns)
    signal, signal_threshold = _resolve_signal(symbol, total_ret, float(forecast_meta["realized_volatility"]))

    forecast: list[dict[str, object]] = []
    next_target = next_prediction_timestamp(symbol, last_timestamp)
    for ret in future_returns:
        price = price * (1 + ret)
        forecast.append({
            "date": next_target.isoformat(),
            "price": round(price, 4),
        })
        next_target = next_prediction_timestamp(symbol, next_target)

    dyn_accuracy = get_average_accuracy(symbol)
    accuracy_status = "measured" if dyn_accuracy is not None else "not_enough_data"

    base_confidence = _estimate_base_confidence(forecast_meta, dyn_accuracy, signal_threshold)

    vol_event = detect_volatility_event(df)
    market_intel = compute_market_confidence(base_confidence, vol_event, news_summary)
    confidence = market_intel["adjusted_confidence"]
    model_version = get_loaded_version(symbol)

    base_volatility = max(
        float(df["volatility_20"].iloc[-1]) if "volatility_20" in df else 0.0,
        float(df["atr_pct"].iloc[-1]) if "atr_pct" in df else 0.0,
        profile.min_signal_return,
    )

    atr = max(profile.min_signal_return, base_volatility)

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

    prediction_target_time = forecast[0]["date"] if forecast else next_prediction_timestamp(symbol, last_timestamp).isoformat()
    prediction_value = round(forecast[0]["price"] if forecast else last_close, 4)

    return {
        "symbol": symbol,
        "historical": historical,
        "predicted": forecast,
        "next_price": prediction_value,
        "prediction_value": prediction_value,
        "prediction_target_time": prediction_target_time,
        "prediction_target_label": profile.prediction_label,
        "prediction_target_display": format_prediction_target(
            symbol,
            parse_candle_timestamp(str(prediction_target_time)),
        ),
        "current_price_label": "Current Live Price (TradingView)",
        "current_price_source": "TradingView widget",
        "prediction_data_source": f"Twelve Data {profile.history_interval} candles",
        "prediction_status": "Live" if profile.history_interval != "1day" else "Next close",
        "signal": signal,
        "confidence": confidence,
        "accuracy": dyn_accuracy,
        "accuracy_status": accuracy_status,
        "accuracy_note": (
            "Based on reconciled backend targets."
            if dyn_accuracy is not None
            else "Not enough reconciled data."
        ),
        "model": "MomentumNet v2 (LSTM + calibration)",
        "model_version": model_version,
        "forecast_meta": {
            "raw_return_pct": round(float(forecast_meta["raw_return"]) * 100, 3),
            "baseline_return_pct": round(float(forecast_meta["baseline_return"]) * 100, 3),
            "adjusted_return_pct": round(float(forecast_meta["adjusted_return"]) * 100, 3),
            "volatility_cap_pct": round(float(forecast_meta["return_cap"]) * 100, 3),
            "signal_threshold_pct": round(signal_threshold * 100, 3),
            "confidence_band_pct": round(float(forecast_meta["confidence_band_pct"]), 3),
            "trades_weekends": profile.trades_weekends,
            "asset_class": profile.asset_class,
            "history_interval": profile.history_interval,
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
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def run_prediction(symbol: str = "XAU/USD") -> dict:
    lock = get_prediction_lock(symbol)
    acquired = lock.acquire(timeout=90)
    if not acquired:
        raise RuntimeError(f"Prediction for {symbol} timed out waiting for lock. Try again.")

    logger.info("[Prediction] START %s", symbol)
    try:
        if not wait_for_training(timeout=300):
            raise RuntimeError(f"Prediction for {symbol} blocked while training is in progress.")
        payload = _run_prediction_locked(symbol)
        logger.info(
            "[Prediction] END %s target=%s version=%s",
            symbol,
            payload.get("prediction_target_time"),
            payload.get("model_version"),
        )
        return payload
    finally:
        lock.release()


def _run_prediction_locked(symbol: str = "XAU/USD") -> dict:
    cache_key = f"predict:{symbol.replace('/', '').lower()}"
    latest_version = get_latest_version(symbol)
    cached = redis_cache.get_prediction(cache_key)
    if cached and cached.get("model_version") == latest_version:
        return cached

    if not is_model_ready(symbol):
        raise RuntimeError(f"LSTM model for {symbol} not trained yet.")

    df = _fetch_and_prepare(symbol)
    if len(df) < WINDOW + 20:
        raise RuntimeError(f"Not enough data rows ({len(df)}) for {symbol}.")

    now_utc = datetime.now(timezone.utc)
    last_candle_timestamp = parse_candle_timestamp(str(df["date"].iloc[-1]))
    if is_partial_candle(symbol, last_candle_timestamp, now_utc=now_utc):
        logger.info(
            "[%s] Dropping partial candle %s before prediction.",
            symbol,
            df["date"].iloc[-1],
        )
        df = df.iloc[:-1].copy()

    if len(df) < WINDOW + 20:
        raise RuntimeError(f"Not enough confirmed rows ({len(df)}) for {symbol}.")

    news_summary = get_sentiment_summary(symbol_to_summary_key(symbol))
    vol_event = detect_volatility_event(df)

    future_returns: list[float] = []
    working_df = df.copy()
    forecast_meta: dict | None = None

    for _ in range(FUTURE_STEPS):
        raw_return = _predict_next_return(symbol, working_df)
        step_meta = _stabilize_prediction(symbol, working_df, raw_return, vol_event, news_summary)
        adjusted_return = float(step_meta["adjusted_return"])
        future_returns.append(adjusted_return)

        if forecast_meta is None:
            forecast_meta = step_meta

        last = working_df.iloc[-1].copy()
        last_timestamp = parse_candle_timestamp(str(last["date"]))
        synthetic_open = float(last["close"])
        synthetic_close = synthetic_open * (1 + adjusted_return)
        next_timestamp = next_prediction_timestamp(symbol, last_timestamp)

        last["date"] = serialize_candle_timestamp(symbol, next_timestamp)
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
        from app.database import save_intelligence_log, save_prediction, supabase

        target_time = payload["prediction_target_time"]
        target_date = str(target_time)[:10] if target_time else None
        if target_date:
            profile = get_asset_profile(symbol)
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

            prediction_record = {
                "symbol": symbol,
                "predicted_price": payload["prediction_value"],
                "confidence": payload["confidence"],
                "signal": payload["signal"],
                "predicted_for": target_date,
                "model_version": payload["model_version"],
                "market_alert": payload["market_intelligence"]["market_alert"],
                "fear_greed_score": score_0_100,
                "volatility_ratio": payload["market_intelligence"]["spike_ratio"],
                "warnings": payload["market_intelligence"]["warnings"],
            }

            if profile.asset_class == "crypto":
                now_utc = datetime.now(timezone.utc)
                lookback_iso = (now_utc - timedelta(minutes=75)).isoformat()
                recent_unreconciled = (
                    supabase.table("predictions")
                    .select("id, actual_price, created_at")
                    .eq("symbol", symbol)
                    .is_("actual_price", "null")
                    .gte("created_at", lookback_iso)
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
                )
                if recent_unreconciled.data:
                    pred_id = recent_unreconciled.data[0]["id"]
                    supabase.table("predictions").update(prediction_record).eq("id", pred_id).execute()
                    logger.info("[%s] Updated latest intraday prediction %s", symbol, pred_id)
                else:
                    save_prediction(prediction_record)
                    logger.info("[%s] Saved new intraday prediction for %s", symbol, target_date)
            else:
                all_existing = (
                    supabase.table("predictions")
                    .select("id, actual_price")
                    .eq("symbol", symbol)
                    .eq("predicted_for", target_date)
                    .order("created_at", desc=True)
                    .execute()
                )

                if all_existing.data:
                    unreconciled = [row for row in all_existing.data if row.get("actual_price") is None]
                    if unreconciled:
                        pred_id = unreconciled[0]["id"]
                        supabase.table("predictions").update(prediction_record).eq("id", pred_id).execute()
                        logger.info("[%s] Updated prediction %s for %s", symbol, pred_id, target_date)
                    else:
                        logger.info("[%s] Prediction for %s already reconciled, skipping insert", symbol, target_date)
                else:
                    save_prediction(prediction_record)
                    logger.info("[%s] Saved new prediction for %s", symbol, target_date)

    except Exception as exc:
        logger.error("Error in Supabase record keeping (%s): %s", symbol, exc)

    return payload
