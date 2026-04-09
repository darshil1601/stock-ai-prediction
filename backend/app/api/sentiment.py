"""
Public sentiment aggregation API (sentiment_summary view).
"""
import logging

from fastapi import APIRouter, HTTPException

from app.services.db_service import get_sentiment_summary
from app.services.event_service import max_event_tier
from app.services.model_input import build_model_feature_vector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sentiment", tags=["sentiment"])


def _slug_to_key(symbol: str) -> str:
    s = symbol.strip().lower()
    if s in ("gold", "xauusd", "xau"):
        return "GOLD"
    if s in ("btc", "bitcoin", "btcusd"):
        return "BTC"
    if s in ("eurusd", "euro", "eur"):
        return "EURUSD"
    raise HTTPException(
        status_code=400,
        detail="Invalid symbol. Use gold, btc, or eurusd.",
    )


@router.get("/{symbol}")
def get_sentiment(symbol: str):
    key = _slug_to_key(symbol)
    row = get_sentiment_summary(key)
    if not row:
        return {
            "symbol": key,
            "avg_sentiment": None,
            "news_count": 0,
            "max_event": 0,
            "max_event_tier": "LOW",
            "source": "empty",
        }

    avg = row.get("avg_sentiment")
    nc = int(row.get("news_count") or 0)
    me = int(row.get("max_event") or 0)

    return {
        "symbol": key,
        "avg_sentiment": avg,
        "news_count": nc,
        "max_event": me,
        "max_event_tier": max_event_tier(me),
        "source": "sentiment_summary",
        "raw": row,
    }


@router.get("/{symbol}/model-input")
def model_input_preview(symbol: str, price: float = 1.0, volume: float = 0.0):
    """
    Helper: [price, volume, avg_sentiment, max_event] for ML extensions.
    """
    key = _slug_to_key(symbol)
    summary = get_sentiment_summary(key)
    vec = build_model_feature_vector(price, volume, summary)
    return {"symbol": key, "feature_vector": vec, "sentiment_summary": summary}
