"""Training triggers and coordination for AI models."""
from __future__ import annotations

import logging
import os
import threading
import time

logger = logging.getLogger(__name__)

_training_mutex = threading.Lock()
_training_active = threading.Event()


def auto_retrain_enabled() -> bool:
    """Master switch: must be 1/true/yes for any automatic train_all."""
    return os.environ.get("ENABLE_AUTO_RETRAIN", "").lower() in ("1", "true", "yes")


def is_training_active() -> bool:
    return _training_active.is_set()


def wait_for_training(timeout: float = 300.0, poll_interval: float = 1.0) -> bool:
    start = time.monotonic()
    while _training_active.is_set():
        if time.monotonic() - start >= timeout:
            return False
        time.sleep(poll_interval)
    return True


def _run_training_job(label: str, fn) -> None:
    with _training_mutex:
        _training_active.set()
        logger.info("[Training] START %s", label)
        try:
            fn()
            logger.info("[Training] END %s", label)
        finally:
            _training_active.clear()


def check_and_trigger_event_retrain() -> None:
    """
    Checks event_log for impact_level >= 2 AND triggered_retrain = false.
    Triggers retrain for affected symbols without overlapping inference.
    """
    if not auto_retrain_enabled():
        return

    from app.database import fetch_pending_events, mark_event_processed
    from app.services.training.lstm_trainer import train

    events = fetch_pending_events()
    if not events:
        return

    logger.info("[EventHandler] Found %s pending high-impact events.", len(events))
    for ev in events:
        symbol = ev.get("symbol")
        event_id = ev.get("id")
        if not symbol:
            continue

        try:
            _run_training_job(
                f"event:{symbol}",
                lambda sym=symbol: train(sym),
            )
            mark_event_processed(event_id)
        except Exception as exc:
            logger.error("[EventHandler] Event retrain failed for %s: %s", symbol, exc)


def retrain_model(async_start: bool = True) -> None:
    """
    Event-driven full retrain. Training is serialized and blocks prediction refreshes.
    """
    if not auto_retrain_enabled():
        logger.info("[retrain_model] Skipped - set ENABLE_AUTO_RETRAIN=1")
        return

    if os.environ.get("RETRAIN_ON_EVENTS", "").lower() not in ("1", "true", "yes"):
        logger.info("[retrain_model] Skipped - set RETRAIN_ON_EVENTS=1")
        return

    def _run():
        try:
            from app.database import save_intelligence_log
            from app.utils.train_all import train_all_symbols

            save_intelligence_log({
                "message": "[AI-Core] Weekly retrain sequence started.",
                "level": "INFO",
                "type": "retraining",
            })

            _run_training_job("full_retrain", train_all_symbols)

            save_intelligence_log({
                "message": "[AI-Core] Weekly retrain sequence complete. All models updated.",
                "level": "SUCCESS",
                "type": "retraining",
            })
        except Exception as exc:
            logger.error("[retrain_model] Failed: %s", exc, exc_info=True)

    if async_start:
        threading.Thread(target=_run, daemon=True, name="full-retrain").start()
    else:
        _run()
