"""Training triggers for AI models."""
from __future__ import annotations

import logging
import os
import threading

logger = logging.getLogger(__name__)

def auto_retrain_enabled() -> bool:
    """Master switch: must be 1/true/yes for any automatic train_all."""
    return os.environ.get("ENABLE_AUTO_RETRAIN", "").lower() in ("1", "true", "yes")


def check_and_trigger_event_retrain() -> None:
    """
    Checks event_log for impact_level >= 2 AND triggered_retrain = false.
    Triggers sequential retrain for affected symbols.
    """
    if not auto_retrain_enabled():
        return

    from app.database import fetch_pending_events, mark_event_processed
    from app.services.training.lstm_trainer import train
    
    events = fetch_pending_events()
    if not events:
        return

    logger.info(f"[EventHandler] Found {len(events)} pending high-impact events.")
    for ev in events:
        symbol = ev.get("symbol")
        event_id = ev.get("id")
        if not symbol:
            continue
        
        try:
            logger.info(f"[EventHandler] Triggering emergency retrain for {symbol} (Event ID: {event_id})")
            train(symbol)
            mark_event_processed(event_id)
        except Exception as e:
            logger.error(f"[EventHandler] Event retrain failed for {symbol}: {e}")

def retrain_model(async_start: bool = True) -> None:
    """
    Event-driven full retrain.
    """
    if not auto_retrain_enabled():
        logger.info("[retrain_model] Skipped — set ENABLE_AUTO_RETRAIN=1")
        return

    if os.environ.get("RETRAIN_ON_EVENTS", "").lower() not in ("1", "true", "yes"):
        logger.info("[retrain_model] Skipped — set RETRAIN_ON_EVENTS=1")
        return

    def _run():
        try:
            from app.utils.train_all import train_all_symbols
            from app.database import save_intelligence_log
            
            save_intelligence_log({
                "message": "[AI-Core] Weekly retrain sequence started.",
                "level": "INFO",
                "type": "retraining"
            })

            logger.info("[retrain_model] Starting train_all_symbols…")
            train_all_symbols()
            
            save_intelligence_log({
                "message": "[AI-Core] Weekly retrain sequence complete. All models updated.",
                "level": "SUCCESS",
                "type": "retraining"
            })
            logger.info("[retrain_model] train_all_symbols finished.")
        except Exception as e:
            logger.error("[retrain_model] Failed: %s", e, exc_info=True)

    if async_start:
        threading.Thread(target=_run, daemon=True).start()
    else:
        _run()
