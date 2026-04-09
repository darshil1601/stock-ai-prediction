"""Training triggers (stub + optional full train)."""
from __future__ import annotations

import logging
import os
import threading

logger = logging.getLogger(__name__)


def auto_retrain_enabled() -> bool:
    """Master switch: must be 1/true/yes for any automatic train_all (news, weekly, emergency)."""
    return os.environ.get("ENABLE_AUTO_RETRAIN", "").lower() in ("1", "true", "yes")


def retrain_model(async_start: bool = True) -> None:
    """
    Event-driven full retrain. Requires ENABLE_AUTO_RETRAIN=1 and RETRAIN_ON_EVENTS=1.
    """
    if not auto_retrain_enabled():
        logger.info("[retrain_model] Skipped — set ENABLE_AUTO_RETRAIN=1 to allow auto retrains")
        return

    if os.environ.get("RETRAIN_ON_EVENTS", "").lower() not in ("1", "true", "yes"):
        logger.info("[retrain_model] Skipped — set RETRAIN_ON_EVENTS=1 for news-triggered retrains")
        return

    def _run():
        try:
            from train_all import train_all_symbols

            logger.info("[retrain_model] Starting train_all_symbols…")
            train_all_symbols()
            logger.info("[retrain_model] train_all_symbols finished.")
        except Exception as e:
            logger.error("[retrain_model] Failed: %s", e, exc_info=True)

    if async_start:
        threading.Thread(target=_run, daemon=True).start()
    else:
        _run()
