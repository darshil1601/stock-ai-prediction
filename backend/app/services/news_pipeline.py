"""
Orchestrates NewsAPI + GDELT → FinBERT → rule events → news_sentiment / event_log.
"""
from __future__ import annotations

import logging

from app.services import db_service
from app.services.event_service import detect_event
from app.services.news_service import fetch_all_merged
from app.services.retrain_service import retrain_model
from app.services.sentiment_service import analyze_sentiment
from app.services.symbol_detection import detect_symbols

logger = logging.getLogger(__name__)


def run_news_ingestion() -> dict:
    """
    Fetch, score, and persist new articles. Returns stats dict.
    """
    stats = {"fetched": 0, "inserted": 0, "skipped_dupes": 0, "errors": 0}
    try:
        rows = fetch_all_merged()
    except Exception as e:
        logger.exception("[news_pipeline] fetch failed: %s", e)
        stats["errors"] += 1
        return stats

    stats["fetched"] = len(rows)
    known_titles = db_service.fetch_recent_titles()

    for row in rows:
        title = row.get("title") or ""
        desc = row.get("description") or ""
        key = title.lower().strip()[:160]
        if key in known_titles:
            stats["skipped_dupes"] += 1
            continue

        try:
            text_for_model = f"{title}. {desc}".strip()
            score, label = analyze_sentiment(text_for_model)
            event_flag, event_type = detect_event(title, desc)
            syms = detect_symbols(title, desc)
        except Exception as e:
            logger.warning("[news_pipeline] scoring row failed: %s", e)
            stats["errors"] += 1
            continue

        for sym in syms:
            record = {
                "symbol": sym,
                "title": title[:2000],
                "description": (desc or "")[:8000],
                "source": (row.get("source") or "")[:500],
                "sentiment_score": score,
                "sentiment_label": label,
                "event_flag": int(event_flag),
                "event_type": event_type,
                "published_at": row.get("published_at"),
            }
            if db_service.insert_news_sentiment(record):
                stats["inserted"] += 1
                known_titles.add(key)

            if int(event_flag) == 2:
                db_service.insert_event_log({
                    "symbol": sym,
                    "event_type": event_type,
                    "severity": 2,
                    "headline": title[:500],
                })
                retrain_model(async_start=True)

    return stats
