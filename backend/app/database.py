"""
database.py — Supabase (PostgreSQL) connection + CRUD helpers
"""
import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

logger = logging.getLogger(__name__)

SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")

# ── Lazy initialization to avoid startup failures ────
_supabase_client: Client | None = None

def get_supabase() -> Client:
    """Get or create Supabase client (lazy initialization)."""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            logger.warning("⚠️  Supabase credentials not configured. Database operations will fail.")
            logger.warning("   Set SUPABASE_URL and SUPABASE_KEY in .env")
            raise ValueError("Supabase credentials missing")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase_client

def __getattr__(name: str) -> Client:
    if name == "supabase":
        return get_supabase()
    raise AttributeError(f"module {__name__} has no attribute {name}")
# ──────────────────────────────────────────────────────
# MARKET PRICES (Historical OHLCV)
# Only XAU/USD is stored in Supabase (gold_prices table).
# EUR/USD prices are fetched directly from Twelve Data API.
# ──────────────────────────────────────────────────────
def save_market_prices(symbol: str, records: list[dict]) -> None:
    """Save OHLCV rows to market_data table."""
    if not records:
        return
    # In the new schema, market_data table HAS a symbol column
    try:
        get_supabase().table("market_data").upsert(records, on_conflict="symbol,date").execute()
    except Exception as e:
        logger.error("[DB] save_market_prices failed", exc_info=True)


def save_intelligence_log(data: dict) -> None:
    """Persist intelligence_logs row (news-derived gauge + volatility; legacy column names)."""
    try:
        get_supabase().table("intelligence_logs").insert(data).execute()
    except Exception as e:
        logger.error("[DB] save_intelligence_log failed", exc_info=True)


def save_live_price(record: dict) -> None:
    """Save latest price snapshot to live_prices table."""
    try:
        get_supabase().table("live_prices").insert(record).execute()
    except Exception as e:
        logger.error("[DB] save_live_price failed", exc_info=True)


def save_model_info(record: dict) -> None:
    """Log training results to model_info table."""
    try:
        get_supabase().table("model_info").insert(record).execute()
    except Exception as e:
        logger.error("[DB] save_model_info failed", exc_info=True)


def get_latest_model_info(symbol: str) -> dict | None:
    """Fetch latest model record from model_info table."""
    try:
        resp = get_supabase().table("model_info") \
            .select("*") \
            .eq("symbol", symbol) \
            .order("last_trained_at", desc=True) \
            .limit(1) \
            .execute()
        if resp.data:
            return resp.data[0]
    except Exception as e:
        logger.error(f"[DB] get_latest_model_info failed: {e}")
    return None


def fetch_pending_events() -> list[dict]:
    """Find high-impact events that haven't triggered a retrain yet."""
    try:
        resp = get_supabase().table("event_log") \
            .select("*") \
            .eq("triggered_retrain", False) \
            .gte("impact_level", 2) \
            .execute()
        return resp.data or []
    except Exception as e:
        logger.error(f"[DB] fetch_pending_events failed: {e}")
    return []


def mark_event_processed(event_id: str | int) -> None:
    """Flag event as processed after successful retrain."""
    try:
        get_supabase().table("event_log") \
            .update({"triggered_retrain": True}) \
            .eq("id", event_id) \
            .execute()
    except Exception as e:
        logger.error(f"[DB] mark_event_processed failed: {e}")


# ──────────────────────────────────────────────────────
# PREDICTIONS  (LSTM output log)
# ──────────────────────────────────────────────────────
def save_prediction(record: dict) -> None:
    """Insert one prediction row."""
    get_supabase().table("predictions").insert(record).execute()


def get_predictions(symbol: str = "XAU/USD", limit: int = 60) -> list[dict]:
    """Fetch latest predictions for a specific symbol."""
    resp = (
        get_supabase().table("predictions")
        .select("*")
        .eq("symbol", symbol)
        .order("predicted_for", desc=True)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return resp.data or []


def get_average_accuracy(symbol: str = "XAU/USD", days: int = 30) -> float:
    """Calculates mean accuracy (100 - abs(diff%)) for the last N records."""
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
            return 76.0 # Fallback
        
        errors = []
        for row in data:
            p = row["predicted_price"]
            a = row["actual_price"]
            if a > 0:
                err = abs((p - a) / a)
                errors.append(err)
        
        if not errors:
            return 76.0
            
        mean_err = sum(errors) / len(errors)
        return round(max(0, 100 * (1 - mean_err)), 1)
    except Exception as e:
        logger.error(f"[DB] get_average_accuracy failed for {symbol}: {e}", exc_info=True)
        return 76.0


def reconcile_predictions():
    """
    UTC-based audit engine — finds past predictions where actual_price is NULL
    and fills them from Twelve Data. Handles market holidays by falling back to
    the nearest previous trading day's close (covers Easter Monday, etc.).
    """
    try:
        from datetime import datetime, timezone, timedelta
        from app.services.twelve_fetcher import fetch_historical_data

        today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 1. Fetch all predictions with NULL actual_price
        resp = get_supabase().table("predictions") \
            .select("id, predicted_for, symbol") \
            .is_("actual_price", "null") \
            .execute()

        null_preds = resp.data or []
        if not null_preds:
            logger.info("[Audit] No NULL predictions to reconcile.")
            return

        # Only process predictions whose target date has strictly passed in UTC
        past_preds = [
            p for p in null_preds
            if p.get("predicted_for") and p["predicted_for"] < today_utc
        ]
        if not past_preds:
            logger.info("[Audit] All NULL predictions are for today or future — nothing to reconcile yet.")
            return

        logger.info(f"[Audit] Found {len(past_preds)} past-date predictions to reconcile.")

        # 2. Group by symbol
        from collections import defaultdict
        by_symbol = defaultdict(list)
        for p in past_preds:
            by_symbol[p["symbol"]].append(p)

        for sym, preds in by_symbol.items():
            try:
                # ── Fetch 60 bars for wider date coverage ──────────────
                df = fetch_historical_data(sym, outputsize=60)
                price_map = {str(row["date"])[:10]: float(row["close"]) for _, row in df.iterrows()}
                # Sorted list of available trading dates (for holiday fallback)
                sorted_dates = sorted(price_map.keys())
            except Exception as e:
                logger.error(f"[Audit] Failed price fetch for {sym}: {e}", exc_info=True)
                continue

            updated_count = 0
            skipped_no_data = 0

            for pred in preds:
                target_date = pred.get("predicted_for")
                if not target_date:
                    continue

                actual_price = price_map.get(target_date)

                # ── HOLIDAY FALLBACK ────────────────────────────────────
                # If the exact date has no candle (market was closed: Easter Monday,
                # bank holidays, etc.) use the last available trading day's close,
                # as long as it's within 4 calendar days (covers long weekends).
                if actual_price is None:
                    prev_dates = [d for d in sorted_dates if d < target_date]
                    if prev_dates:
                        fallback_date = prev_dates[-1]
                        target_dt   = datetime.strptime(target_date,   "%Y-%m-%d")
                        fallback_dt = datetime.strptime(fallback_date, "%Y-%m-%d")
                        gap_days = (target_dt - fallback_dt).days
                        if gap_days <= 4:
                            actual_price = price_map[fallback_date]
                            logger.info(
                                f"[Audit] {sym}: {target_date} has no candle "
                                f"(market holiday). Using {fallback_date} close "
                                f"({actual_price}) — gap={gap_days}d."
                            )

                if actual_price is None:
                    skipped_no_data += 1
                    logger.warning(f"[Audit] {sym}: No price data for {target_date} — skipping.")
                    continue

                # ── Write actual_price back to Supabase ─────────────────
                get_supabase().table("predictions") \
                    .update({"actual_price": actual_price}) \
                    .eq("id", pred["id"]) \
                    .execute()
                updated_count += 1

            if updated_count:
                logger.info(f"✅ [Audit] {sym}: {updated_count} reconciled, {skipped_no_data} skipped (no data).")
            elif skipped_no_data:
                logger.warning(f"⚠️  [Audit] {sym}: 0 reconciled, {skipped_no_data} skipped (no Twelve Data candle).")

    except Exception as e:
        logger.error(f"[Audit] reconcile_predictions crashed: {e}", exc_info=True)
        raise  # Re-raise so caller knows reconciliation failed