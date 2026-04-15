"""
database.py - Supabase connection helpers and audit persistence.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from supabase import Client, create_client

from app.services.asset_profile import get_asset_profile

load_dotenv()

logger = logging.getLogger(__name__)

URL_ENV = "SUPABASE_URL"
KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY"


def get_supabase_creds() -> tuple[str, str]:
    url = os.environ.get(URL_ENV)
    key = os.environ.get(KEY_ENV)

    if not url or not key:
        missing = [name for name in (URL_ENV, KEY_ENV) if not os.environ.get(name)]
        err_msg = f"Critical env missing: {', '.join(missing)}"
        logger.error(err_msg)
        raise ValueError(err_msg)
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
            .order("predicted_for", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception as exc:
        logger.error("[DB] get_predictions failed: %s", exc)
        return []


def get_average_accuracy(symbol: str = "XAU/USD", days: int = 30, min_records: int = 5) -> float | None:
    """Mean accuracy (100 - abs(diff%)) for recent reconciled records or None if insufficient."""
    try:
        resp = (
            get_supabase()
            .table("predictions")
            .select("predicted_price, actual_price")
            .eq("symbol", symbol)
            .not_.is_("actual_price", "null")
            .order("created_at", desc=True)
            .limit(days)
            .execute()
        )
        data = resp.data or []
        errors: list[float] = []
        for row in data:
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
        today_utc = now_utc.strftime("%Y-%m-%d")
        yesterday_utc = (now_utc - timedelta(days=1)).strftime("%Y-%m-%d")

        resp = (
            get_supabase()
            .table("predictions")
            .select("id, predicted_for, symbol")
            .is_("actual_price", "null")
            .execute()
        )

        null_preds = resp.data or []
        if not null_preds:
            return

        from collections import defaultdict

        grouped: dict[str, list[dict]] = defaultdict(list)
        for pred in null_preds:
            symbol = pred["symbol"]
            profile = get_asset_profile(symbol)

            if profile.asset_class == "crypto":
                cutoff_date = today_utc
            else:
                markets_closed_today = (now_utc.hour + now_utc.minute / 60.0) >= 22.5
                cutoff_date = today_utc if markets_closed_today else yesterday_utc

            if pred["predicted_for"] <= cutoff_date:
                grouped[symbol].append(pred)

        for symbol, preds in grouped.items():
            try:
                profile = get_asset_profile(symbol)
                outputsize = 240 if profile.history_interval != "1day" else 60
                df = fetch_historical_data(symbol, outputsize=outputsize)

                price_map: dict[str, float] = {}
                for _, row in df.iterrows():
                    key = str(row["date"])[:10]
                    price_map[key] = float(row["close"])

                for pred in preds:
                    actual = price_map.get(pred["predicted_for"])
                    if actual is not None:
                        get_supabase().table("predictions").update({"actual_price": actual}).eq("id", pred["id"]).execute()
            except Exception as exc:
                logger.error("[Audit] Partial failure for %s: %s", symbol, exc)

        logger.info("[Audit] Reconciliation cycle complete.")
    except Exception as exc:
        logger.error("[Audit] Reconciliation failed: %s", exc, exc_info=True)
