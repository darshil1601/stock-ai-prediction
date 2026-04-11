"""
prediction.py — FastAPI router for multi-symbol predictions (v1)
"""
import time
import logging
import threading
from fastapi import APIRouter, HTTPException
from app.services.prediction_service import run_prediction
from app.services.twelve_fetcher import fetch_live_quote
from app import cache as redis_cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["prediction"])

# ── Rate-limit reconcile calls from /history (once per 5 min) ─────────────────
_last_reconcile_ts: float = 0.0
_RECONCILE_COOLDOWN_SECS: float = 300.0  # 5 minutes


def _maybe_reconcile_background() -> None:
    """Fire reconcile in a daemon thread if the cooldown has passed."""
    global _last_reconcile_ts
    now = time.monotonic()
    if now - _last_reconcile_ts > _RECONCILE_COOLDOWN_SECS:
        _last_reconcile_ts = now
        from app.database import reconcile_predictions
        threading.Thread(target=reconcile_predictions, daemon=True, name="reconcile-bg").start()
        logger.info("[history] Background reconcile triggered.")


def _resolve_symbol(symbol: str) -> str | None:
    """Map URL slug → canonical data symbol."""
    s = symbol.lower()
    if s in ("gold", "xauusd", "xau"):
        return "XAU/USD"
    if s in ("eurusd", "euro", "eur"):
        return "EUR/USD"
    if s in ("btc", "bitcoin", "btcusd", "btcusdt", "xbt"):
        return "BTC/USD"
    return None


@router.get("/{symbol}/predict")
def predict_symbol(symbol: str):
    """Returns LSTM prediction for XAU/USD, EUR/USD, or BTC/USD."""
    sym = _resolve_symbol(symbol)
    if not sym:
        raise HTTPException(status_code=400, detail="Invalid symbol. Use 'gold', 'eurusd', or 'btc'.")
    
    try:
        return run_prediction(sym)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")

@router.get("/{symbol}/history")
def prediction_history(symbol: str, limit: int = 20):
    """
    Returns prediction performance log (audit table).
    Automatically triggers a background reconciliation pass at most once per 5 minutes
    so that past-date NULL prices are healed without burning API credits on every call.
    """
    sym = _resolve_symbol(symbol)
    if not sym:
        raise HTTPException(status_code=400, detail="Invalid symbol.")
    
    try:
        from app.database import get_predictions
        # Kick off background reconcile (rate-limited — won't run more than once per 5 min)
        _maybe_reconcile_background()
        return get_predictions(sym, limit=limit)
    except Exception as e:
        logger.error(f"[history] Error for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"History fetch error: {e}")

@router.get("/{symbol}/price")
def live_price(symbol: str):
    """Returns real-time price from Twelve Data."""
    sym = _resolve_symbol(symbol)
    if not sym:
        raise HTTPException(status_code=400, detail="Invalid symbol.")

    cached = redis_cache.get_live_price(sym)
    if cached:
        return {**cached, "source": "cache"}

    try:
        data = fetch_live_quote(sym)
        redis_cache.set_live_price(data, sym)
        
        # Save snapshot to DB
        from app.database import save_live_price
        save_live_price({
            "symbol": sym,
            "price": data["price"],
            "change": data["change"],
            "change_pct": data["change_pct"]
        })
        
        return {**data, "source": "twelve_data"}
    except Exception as e:
        logger.error(f"[price] Error for {sym}: {e}", exc_info=True)
        raise HTTPException(status_code=503, detail=f"Price fetch error: {e}")

@router.post("/{symbol}/refresh")
def refresh_prediction(symbol: str):
    """Force-clears cached prediction and re-runs LSTM. Use this to fix stale date predictions."""
    sym = _resolve_symbol(symbol)
    if not sym:
        raise HTTPException(status_code=400, detail="Invalid symbol. Use 'gold', 'eurusd', or 'btc'.")
    
    try:
        # Clear the prediction cache
        cache_key = f"predict:{sym.replace('/', '').lower()}"
        from app import cache as _cache
        _cache._redis.delete(cache_key)
        
        # Re-run fresh prediction
        result = run_prediction(sym)
        return {"status": "refreshed", **result}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh error: {e}")

@router.post("/reconcile")
def manual_reconcile():
    """
    Manually trigger actual_price reconciliation for all past predictions.
    Use this to immediately heal NULL actual_prices without waiting for the scheduler.
    Runs synchronously so you can see the result instantly.
    """
    try:
        from app.database import reconcile_predictions, supabase
        from datetime import datetime, timezone

        today_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Count NULLs before
        before = supabase.table("predictions") \
            .select("id", count="exact") \
            .is_("actual_price", "null") \
            .lt("predicted_for", today_utc) \
            .execute()
        null_before = before.count or 0

        reconcile_predictions()

        # Count NULLs after
        after = supabase.table("predictions") \
            .select("id", count="exact") \
            .is_("actual_price", "null") \
            .lt("predicted_for", today_utc) \
            .execute()
        null_after = after.count or 0

        filled = null_before - null_after
        logger.info(f"[/reconcile] Manual reconcile: {filled} filled, {null_after} still pending.")
        return {
            "status": "ok",
            "null_before": null_before,
            "null_after": null_after,
            "filled": filled,
            "message": f"Reconciled {filled} prediction(s). {null_after} still pending (today or no market data).",
        }
    except Exception as e:
        logger.error(f"[/reconcile] Manual reconcile failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Reconcile error: {e}")

