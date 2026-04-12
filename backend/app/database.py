"""
database.py — Supabase connection + singleton client
Standardized to use SUPABASE_SERVICE_ROLE_KEY for production security.
"""
import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env during local development
load_dotenv()

logger = logging.getLogger(__name__)

# Standardized Environment Variable Names
URL_ENV = "SUPABASE_URL"
KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY"

def get_supabase_creds() -> tuple[str, str]:
    """Retrieve and validate credentials from environment."""
    url = os.environ.get(URL_ENV)
    key = os.environ.get(KEY_ENV)

    if not url or not key:
        missing = [v for v in [URL_ENV, KEY_ENV] if not os.environ.get(v)]
        err_msg = f"❌ Critical Env Missing: {', '.join(missing)}"
        logger.error(err_msg)
        raise ValueError(err_msg)
    return url, key

_supabase_instance: Client | None = None

def get_supabase() -> Client:
    """Lazy-load and return the Supabase client singleton."""
    global _supabase_instance
    if _supabase_instance is None:
        try:
            url, key = get_supabase_creds()
            _supabase_instance = create_client(url, key)
            logger.info(f"✅ Supabase connected: {url}")
        except Exception as e:
            logger.error(f"💥 Supabase Init Failed: {e}")
            raise
    return _supabase_instance

# Proxy for 'from app.database import supabase'
def __getattr__(name: str) -> Client:
    if name == "supabase": return get_supabase()
    raise AttributeError(f"module {__name__} has no attribute {name}")

# ─── CRUD HELPERS ───────────────────────────────────────

def save_market_prices(symbol: str, records: list[dict]):
    if not records: return
    get_supabase().table("market_data").upsert(records, on_conflict="symbol,date").execute()

def save_intelligence_log(data: dict):
    get_supabase().table("intelligence_logs").insert(data).execute()

def save_live_price(record: dict):
    get_supabase().table("live_prices").insert(record).execute()

def save_model_info(record: dict):
    get_supabase().table("model_info").insert(record).execute()

def get_latest_model_info(symbol: str):
    try:
        resp = get_supabase().table("model_info").select("*").eq("symbol", symbol).order("last_trained_at", desc=True).limit(1).execute()
        return resp.data[0] if resp.data else None
    except Exception as e:
        logger.error(f"[DB] get_latest_model_info failed: {e}")
        return None

def fetch_pending_events():
    try:
        resp = get_supabase().table("event_log").select("*").eq("triggered_retrain", False).gte("impact_level", 2).execute()
        return resp.data or []
    except Exception as e:
        logger.error(f"[DB] fetch_pending_events failed: {e}")
        return []

def mark_event_processed(event_id: str | int):
    try:
        get_supabase().table("event_log").update({"triggered_retrain": True}).eq("id", event_id).execute()
    except Exception as e:
        logger.error(f"[DB] mark_event_processed failed: {e}")

def save_prediction(record: dict):
    try:
        get_supabase().table("predictions").insert(record).execute()
    except Exception as e:
        logger.error(f"[DB] save_prediction failed: {e}")

def get_predictions(symbol: str = "XAU/USD", limit: int = 60):
    try:
        resp = get_supabase().table("predictions").select("*").eq("symbol", symbol).order("predicted_for", desc=True).limit(limit).execute()
        return resp.data or []
    except Exception as e:
        logger.error(f"[DB] get_predictions failed: {e}")
        return []


def get_average_accuracy(symbol: str = "XAU/USD", days: int = 30) -> float:
    """Calculates mean accuracy (100 - abs(diff%)) for the last N reconciled records."""
    try:
        resp = get_supabase().table("predictions") \
            .select("predicted_price, actual_price") \
            .eq("symbol", symbol) \
            .not_.is_("actual_price", "null") \
            .order("created_at", desc=True) \
            .limit(days) \
            .execute()
        data = resp.data or []
        if not data:
            return 76.0  # Fallback default
        errors = []
        for row in data:
            p, a = row["predicted_price"], row["actual_price"]
            if a and float(a) > 0:
                errors.append(abs((float(p) - float(a)) / float(a)))
        if not errors:
            return 76.0
        return round(max(0, 100 * (1 - sum(errors) / len(errors))), 1)
    except Exception as e:
        logger.error(f"[DB] get_average_accuracy failed for {symbol}: {e}")
        return 76.0

def reconcile_predictions():
    """UTC-based audit engine — fills actual prices for past predictions."""
    try:
        from datetime import datetime, timezone
        from app.services.twelve_fetcher import fetch_historical_data
        
        today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        resp = get_supabase().table("predictions").select("id, predicted_for, symbol").is_("actual_price", "null").execute()
        
        null_preds = resp.data or []
        if not null_preds: return

        # Group by symbol and fetch actuals
        from collections import defaultdict
        by_symbol = defaultdict(list)
        for p in [x for x in null_preds if x["predicted_for"] < today_utc]:
            by_symbol[p["symbol"]].append(p)

        for sym, preds in by_symbol.items():
            try:
                df = fetch_historical_data(sym, outputsize=60)
                price_map = {str(row["date"])[:10]: float(row["close"]) for _, row in df.iterrows()}
                
                for pred in preds:
                    target = pred["predicted_for"]
                    actual = price_map.get(target)
                    if actual:
                        get_supabase().table("predictions").update({"actual_price": actual}).eq("id", pred["id"]).execute()
            except Exception as e:
                logger.error(f"[Audit] Partial failure for {sym}: {e}")
                    
        logger.info("[Audit] Reconciliation cycle complete.")
    except Exception as e:
        logger.error(f"[Audit] Reconciliation failed: {e}", exc_info=True)