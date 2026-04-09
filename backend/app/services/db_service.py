"""
Supabase helpers for news_sentiment, sentiment_summary, event_log.
"""
from __future__ import annotations

import logging
from typing import Any

from app.database import supabase

logger = logging.getLogger(__name__)


def symbol_to_summary_key(trading_symbol: str) -> str:
    """Map Twelve Data symbol to sentiment_summary.symbol (view)."""
    m = {
        "XAU/USD": "GOLD",
        "BTC/USD": "BTC",
        "EUR/USD": "EURUSD",
    }
    return m.get(trading_symbol, trading_symbol.replace("/", ""))


def summary_key_to_trading(summary_key: str) -> str | None:
    u = summary_key.strip().upper()
    inv = {"GOLD": "XAU/USD", "BTC": "BTC/USD", "EURUSD": "EUR/USD", "XAU": "XAU/USD"}
    return inv.get(u)


def _aggregate_from_news_table(symbol_key: str, limit_rows: int = 300) -> dict[str, Any] | None:
    """When sentiment_summary view is empty or missing, aggregate news_sentiment in Python."""
    try:
        resp = (
            supabase.table("news_sentiment")
            .select("sentiment_score,event_flag")
            .eq("symbol", symbol_key.upper())
            .order("published_at", desc=True)
            .limit(limit_rows)
            .execute()
        )
        rows = resp.data or []
        if not rows:
            return None
        scores: list[float] = []
        max_ev = 0
        for row in rows:
            try:
                scores.append(float(row.get("sentiment_score") or 0.0))
            except (TypeError, ValueError):
                scores.append(0.0)
            try:
                max_ev = max(max_ev, int(row.get("event_flag") or 0))
            except (TypeError, ValueError):
                pass
        avg = sum(scores) / len(scores) if scores else 0.0
        return {
            "symbol": symbol_key.upper(),
            "avg_sentiment": round(avg, 6),
            "news_count": len(rows),
            "max_event": max_ev,
            "source": "news_sentiment_aggregate",
        }
    except Exception as e:
        logger.warning("[db_service] aggregate news_sentiment failed for %s: %s", symbol_key, e)
        return None


def get_sentiment_summary(symbol_key: str) -> dict[str, Any] | None:
    """
    symbol_key: GOLD | BTC | EURUSD (as stored in news_sentiment / view).
    Prefer DB view; if no row, aggregate from news_sentiment (view broken or not populated).
    """
    key = symbol_key.upper()
    try:
        resp = (
            supabase.table("sentiment_summary")
            .select("*")
            .eq("symbol", key)
            .limit(1)
            .execute()
        )
        rows = resp.data or []
        if rows:
            return rows[0]
    except Exception as e:
        logger.warning("[db_service] sentiment_summary query failed for %s: %s", key, e)

    return _aggregate_from_news_table(key)


def insert_news_sentiment(record: dict[str, Any]) -> bool:
    try:
        supabase.table("news_sentiment").insert(record).execute()
        return True
    except Exception as e:
        logger.error("[db_service] news_sentiment insert failed: %s", e, exc_info=True)
        return False


def insert_event_log(record: dict[str, Any]) -> bool:
    try:
        supabase.table("event_log").insert(record).execute()
        return True
    except Exception as e:
        logger.error("[db_service] event_log insert failed: %s", e, exc_info=True)
        return False


def fetch_recent_titles(limit: int = 500) -> set[str]:
    """Dedupe ingestion by title prefix (recent rows)."""
    titles: set[str] = set()
    try:
        resp = (
            supabase.table("news_sentiment")
            .select("title")
            .order("published_at", desc=True)
            .limit(limit)
            .execute()
        )
        for row in resp.data or []:
            t = (row.get("title") or "").lower().strip()[:160]
            if t:
                titles.add(t)
    except Exception as e:
        logger.warning("[db_service] recent titles fetch failed: %s", e)
    return titles
