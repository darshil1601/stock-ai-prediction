"""
News aggregation: NewsAPI + GDELT DOC API.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)

NEWS_QUERY = "bitcoin OR gold OR eurusd OR war OR inflation OR tariff"

GDELT_DOC_URL = "https://api.gdeltproject.org/api/v2/doc/doc"


def _parse_iso(dt: str | None) -> str | None:
    if not dt:
        return None
    try:
        if dt.endswith("Z"):
            dt = dt.replace("Z", "+00:00")
        d = datetime.fromisoformat(dt)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc).isoformat()
    except Exception:
        return dt


def fetch_newsapi_articles(max_results: int = 40) -> list[dict[str, Any]]:
    key = os.environ.get("NEWSAPI_KEY")
    if not key:
        logger.warning("[NewsAPI] NEWSAPI_KEY not set; skipping NewsAPI")
        return []

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": NEWS_QUERY,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": min(max_results, 100),
        "apiKey": key,
    }
    try:
        r = requests.get(url, params=params, timeout=25)
        r.raise_for_status()
        data = r.json()
        articles = data.get("articles") or []
    except Exception as e:
        logger.warning("[NewsAPI] fetch failed: %s", e)
        return []

    out: list[dict[str, Any]] = []
    for a in articles:
        title = (a.get("title") or "").strip()
        if not title:
            continue
        src = (a.get("source") or {})
        source_name = src.get("name") if isinstance(src, dict) else str(src)
        out.append({
            "title": title,
            "description": (a.get("description") or "").strip(),
            "source": source_name or "NewsAPI",
            "published_at": _parse_iso(a.get("publishedAt")),
        })
    return out


def fetch_gdelt_articles(max_records: int = 30) -> list[dict[str, Any]]:
    params = {
        "query": NEWS_QUERY,
        "mode": "ArtList",
        "maxrecords": str(min(max_records, 250)),
        "format": "json",
    }
    try:
        r = requests.get(GDELT_DOC_URL, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        logger.warning("[GDELT] fetch failed: %s", e)
        return []

    articles = data.get("articles") or []
    out: list[dict[str, Any]] = []
    for a in articles:
        title = (a.get("title") or "").strip()
        if not title:
            continue
        seen = (a.get("seendate") or "")[:8]
        pub = None
        if len(seen) == 8:
            try:
                pub = datetime.strptime(seen, "%Y%m%d").replace(tzinfo=timezone.utc).isoformat()
            except Exception:
                pub = seen

        domain = (a.get("domain") or "").strip() or "GDELT"
        out.append({
            "title": title,
            "description": "",
            "source": domain,
            "published_at": pub,
        })
    return out


def fetch_all_merged(limit_per_source: int = 35) -> list[dict[str, Any]]:
    newsapi = fetch_newsapi_articles(limit_per_source)
    gdelt = fetch_gdelt_articles(limit_per_source)
    seen: set[str] = set()
    merged: list[dict[str, Any]] = []
    for row in newsapi + gdelt:
        key = row["title"].lower().strip()[:160]
        if key in seen:
            continue
        seen.add(key)
        merged.append(row)
    return merged
