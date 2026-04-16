"""
database.py - Supabase connection helpers and audit persistence.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, time, timedelta, timezone

from dotenv import load_dotenv
from supabase import Client, create_client

from app.services.asset_profile import (
    format_prediction_target,
    get_asset_profile,
    parse_candle_timestamp,
    resolve_history_interval,
)

load_dotenv()

logger = logging.getLogger(__name__)

URL_ENV = "SUPABASE_URL"
KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY"


def get_supabase_creds() -> tuple[str, str]:
    # .strip() is added to handle common copy-paste errors with trailing/leading spaces
    url = os.environ.get(URL_ENV, "").strip()
    key = os.environ.get(KEY_ENV, "").strip()

    if not url or not key:
        missing = [name for name in (URL_ENV, KEY_ENV) if not os.environ.get(name)]
        err_msg = (
            f"CRITICAL: Supabase credentials ({', '.join(missing)}) are missing in environment. "
            "Please check GitHub Repository Secrets and ensure no leading/trailing spaces exist."
        )
        logger.error(err_msg)
        raise ValueError(err_msg)
    
    if not url.startswith("http"):
        raise ValueError(f"Invalid Supabase URL: '{url}'. Must start with http:// or https://")

    return url, key


_supabase_instance: Client | None = None


def get_supabase() -> Client:
    global _supabase_instance
    if _supabase_instance is None:
        url, key = get_supabase_creds()
        _supabase_instance = create_client(url, key)
        logger.info("Supabase connected: %s", url)
    return _supabase_instance


def __getattr__(name: str) -> Client:
    if name == "supabase":
        return get_supabase()
    raise AttributeError(f"module {__name__} has no attribute {name}")


def _parse_iso_timestamp(raw: str | None) -> datetime | None:
    if not raw:
        return None
    text = str(raw).strip()
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _prediction_interval_for_row(symbol: str, row: dict) -> str:
    predicted_for = row.get("predicted_for")
    if predicted_for:
        return resolve_history_interval(symbol, str(predicted_for))
    created_at = _parse_iso_timestamp(row.get("created_at"))
    return resolve_history_interval(symbol, created_at)


def _estimate_target_timestamp(row: dict, symbol: str) -> datetime | None:
    profile = get_asset_profile(symbol)
    row_interval = _prediction_interval_for_row(symbol, row)
    if row_interval != "1day":
        created_at = _parse_iso_timestamp(row.get("created_at"))
        if not created_at:
            return None
        base = created_at.replace(minute=0, second=0, microsecond=0)
        return base + profile.target_step
    
    raw_predicted_for = row.get("predicted_for")
    if not raw_predicted_for:
        return None
    try:
        target_day = datetime.strptime(str(raw_predicted_for), "%Y-%m-%d").date()
    except ValueError:
        return None

    close_hour = profile.market_close_hour_utc if profile.market_close_hour_utc is not None else 22
    close_minute = profile.market_close_minute_utc if profile.market_close_minute_utc is not None else 0
    return datetime.combine(target_day, time(close_hour, close_minute), tzinfo=timezone.utc)


def _first_close_at_or_after(
    candles: list[tuple[datetime, float]],
    target_timestamp: datetime,
) -> float | None:
    for ts, close in candles:
        if ts >= target_timestamp:
            return close
    return None


def save_market_prices(symbol: str, records: list[dict]):
    if not records:
        return
    get_supabase().table("market_data").upsert(records, on_conflict="symbol,date").execute()


def save_intelligence_log(data: dict):
    get_supabase().table("intelligence_logs").insert(data).execute()


def save_live_price(record: dict):
    get_supabase().table("live_prices").insert(record).execute()


def save_model_info(record: dict):
    get_supabase().table("model_info").insert(record).execute()


def get_latest_model_info(symbol: str):
    try:
        resp = (
            get_supabase()
            .table("model_info")
            .select("*")
            .eq("symbol", symbol)
            .order("last_trained_at", desc=True)
            .limit(1)
            .execute()
        )
        return resp.data[0] if resp.data else None
    except Exception as exc:
        logger.error("[DB] get_latest_model_info failed: %s", exc)
        return None


def fetch_pending_events():
    try:
        resp = (
            get_supabase()
            .table("event_log")
            .select("*")
            .eq("triggered_retrain", False)
            .gte("impact_level", 2)
            .execute()
        )
        return resp.data or []
    except Exception as exc:
        logger.error("[DB] fetch_pending_events failed: %s", exc)
        return []


def mark_event_processed(event_id: str | int):
    try:
        get_supabase().table("event_log").update({"triggered_retrain": True}).eq("id", event_id).execute()
    except Exception as exc:
        logger.error("[DB] mark_event_processed failed: %s", exc)


def save_prediction(record: dict):
    try:
        get_supabase().table("predictions").insert(record).execute()
    except Exception as exc:
        logger.error("[DB] save_prediction failed: %s", exc)


def get_predictions(symbol: str = "XAU/USD", limit: int = 60):
    try:
        resp = (
            get_supabase()
            .table("predictions")
            .select("*")
            .eq("symbol", symbol)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = resp.data or []
        for row in rows:
            target_ts = _estimate_target_timestamp(row, symbol)
            if not target_ts:
                continue
            row["prediction_target_time"] = target_ts.isoformat()
            row["prediction_target_display"] = format_prediction_target(symbol, target_ts)
        return rows
    except Exception as exc:
        logger.error("[DB] get_predictions failed: %s", exc)
        return []


def get_average_accuracy(symbol: str = "XAU/USD", days: int = 30, min_records: int = 5) -> float | None:
    """Mean accuracy (100 - abs(diff%)) for recent reconciled records or None if insufficient."""
    try:
        now_utc = datetime.now(timezone.utc)
        lookback = (now_utc - timedelta(days=days)).isoformat()
        resp = (
            get_supabase()
            .table("predictions")
            .select("predicted_price, actual_price, predicted_for, created_at")
            .eq("symbol", symbol)
            .not_.is_("actual_price", "null")
            .gte("created_at", lookback)
            .order("created_at", desc=True)
            .execute()
        )
        data = resp.data or []
        errors: list[float] = []
        for row in data:
            if _prediction_interval_for_row(symbol, row) != "1day":
                target_ts = _estimate_target_timestamp(row, symbol)
                if not target_ts or target_ts > now_utc:
                    continue
            predicted = row.get("predicted_price")
            actual = row.get("actual_price")
            if actual and float(actual) > 0:
                errors.append(abs((float(predicted) - float(actual)) / float(actual)))

        if len(errors) < min_records:
            return None
        return round(max(0, 100 * (1 - sum(errors) / len(errors))), 1)
    except Exception as exc:
        logger.error("[DB] get_average_accuracy failed for %s: %s", symbol, exc)
        return None


def reconcile_predictions():
    """Fill actual prices for historical predictions with asset-aware reconciliation windows."""
    try:
        from app.services.twelve_fetcher import fetch_historical_data

        now_utc = datetime.now(timezone.utc)

        resp = (
            get_supabase()
            .table("predictions")
            .select("id, predicted_for, symbol, created_at")
            .is_("actual_price", "null")
            .execute()
        )

        null_preds = resp.data or []
        if not null_preds:
            return

        from collections import defaultdict

        intraday_grouped: dict[str, list[dict]] = defaultdict(list)
        daily_grouped: dict[str, list[dict]] = defaultdict(list)
        for pred in null_preds:
            symbol = pred["symbol"]
            profile = get_asset_profile(symbol)
            target_ts = _estimate_target_timestamp(pred, symbol)
            if not target_ts:
                continue

            ready_at = target_ts + timedelta(minutes=profile.candle_confirmation_buffer_minutes)
            if ready_at > now_utc:
                continue

            row_interval = _prediction_interval_for_row(symbol, pred)
            if row_interval != "1day":
                intraday_grouped[symbol].append(pred)
            else:
                daily_grouped[symbol].append(pred)

        for symbol, preds in intraday_grouped.items():
            try:
                outputsize = max(720, len(preds) * 8)
                df = fetch_historical_data(symbol, outputsize=outputsize, interval="1h")

                candles: list[tuple[datetime, float]] = []
                for _, row in df.iterrows():
                    try:
                        ts = parse_candle_timestamp(row["date"])
                    except Exception:
                        continue
                    candles.append((ts.astimezone(timezone.utc), float(row["close"])))

                if not candles:
                    continue

                for pred in preds:
                    target_ts = _estimate_target_timestamp(pred, symbol)
                    if not target_ts:
                        continue

                    actual = _first_close_at_or_after(candles, target_ts)
                    if actual is not None:
                        get_supabase().table("predictions").update({"actual_price": actual}).eq("id", pred["id"]).execute()
            except Exception as exc:
                logger.error("[Audit] Partial intraday failure for %s: %s", symbol, exc)

        for symbol, preds in daily_grouped.items():
            try:
                outputsize = max(60, len(preds) + 10)
                df = fetch_historical_data(symbol, outputsize=outputsize, interval="1day")

                price_map: dict[str, float] = {}
                for _, row in df.iterrows():
                    key = str(row["date"])[:10]
                    price_map[key] = float(row["close"])

                for pred in preds:
                    actual = price_map.get(pred["predicted_for"])
                    if actual is not None:
                        get_supabase().table("predictions").update({"actual_price": actual}).eq("id", pred["id"]).execute()
            except Exception as exc:
                logger.error("[Audit] Partial daily failure for %s: %s", symbol, exc)

        logger.info("[Audit] Reconciliation cycle complete.")
    except Exception as exc:
        logger.error("[Audit] Reconciliation failed: %s", exc, exc_info=True)
