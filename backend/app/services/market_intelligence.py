"""
market_intelligence.py — Real-time Market Intelligence Layer

1. Volatility Detection — abnormal moves vs rolling std
2. News sentiment (FinBERT aggregates via sentiment_summary) — confidence adjustment
3. Unified confidence score for the prediction payload
"""
import logging
import pandas as pd
from typing import Any, Literal

logger = logging.getLogger(__name__)

VOLATILITY_SPIKE_THRESHOLD = 2.0
AlertLevel = Literal["normal", "caution", "warning", "danger"]


def detect_volatility_event(df: pd.DataFrame) -> dict:
    """
    Returns is_event, spike_ratio, current_move, avg_move, alert_level.
    """
    try:
        returns = df["close"].pct_change().dropna()
        if len(returns) < 21:
            return _neutral_volatility()

        current_move = abs(float(returns.iloc[-1]))
        avg_move = float(returns.rolling(20).std().iloc[-1])

        if avg_move == 0:
            return _neutral_volatility()

        spike_ratio = current_move / avg_move

        if spike_ratio >= 4.0:
            alert_level = "danger"
        elif spike_ratio >= VOLATILITY_SPIKE_THRESHOLD:
            alert_level = "warning"
        elif spike_ratio >= 1.5:
            alert_level = "caution"
        else:
            alert_level = "normal"

        is_event = spike_ratio >= VOLATILITY_SPIKE_THRESHOLD

        logger.info(
            "[MarketIntel] Volatility: %.2fx (Alert: %s)",
            spike_ratio,
            alert_level.upper(),
        )

        return {
            "is_event": is_event,
            "spike_ratio": round(spike_ratio, 2),
            "current_move": round(current_move * 100, 3),
            "avg_move": round(avg_move * 100, 3),
            "alert_level": alert_level,
        }

    except Exception as e:
        logger.warning("[MarketIntel] Volatility detection failed: %s", e)
        return _neutral_volatility()


def _neutral_volatility() -> dict:
    return {
        "is_event": False,
        "spike_ratio": 1.0,
        "current_move": 0.0,
        "avg_move": 0.0,
        "alert_level": "normal",
    }


def _aggregate_sentiment_label(avg_score: float) -> str:
    if avg_score > 0.15:
        return "positive"
    if avg_score < -0.15:
        return "negative"
    return "neutral"


def compute_market_confidence(
    base_confidence: float,
    vol_event: dict,
    news_sentiment: dict[str, Any] | None = None,
) -> dict:
    """
    news_sentiment: optional keys from sentiment_summary —
      avg_sentiment (float), max_event (int), news_count (int).
    """
    warnings: list[str] = []
    penalty = 0.0

    alert = vol_event.get("alert_level", "normal")
    spike = vol_event.get("spike_ratio", 1.0)
    is_event = vol_event.get("is_event", False)

    if alert == "danger":
        penalty += 0.40
        warnings.append(
            f"🔴 EXTREME volatility ({spike:.1f}× normal). "
            "Major shock possible — confidence reduced."
        )
    elif alert == "warning":
        penalty += 0.25
        warnings.append(
            f"🟠 High volatility ({spike:.1f}× normal). "
            "Use signal as directional only."
        )
    elif alert == "caution":
        penalty += 0.10
        warnings.append(
            f"🟡 Elevated volatility ({spike:.1f}× normal). "
            "Monitor headlines and size."
        )

    avg_score = 0.0
    max_event = 0
    news_count = 0
    if news_sentiment:
        try:
            avg_score = float(news_sentiment.get("avg_sentiment") or 0.0)
        except (TypeError, ValueError):
            avg_score = 0.0
        try:
            max_event = int(news_sentiment.get("max_event") or 0)
        except (TypeError, ValueError):
            max_event = 0
        try:
            news_count = int(news_sentiment.get("news_count") or 0)
        except (TypeError, ValueError):
            news_count = 0

    if max_event >= 2:
        penalty += 0.30
        warnings.append(
            "🌍 High-severity news cluster (conflict / war-related). "
            "FinBERT + headline rules flag HIGH event tier."
        )
    elif max_event >= 1:
        penalty += 0.12
        warnings.append(
            "📰 Macro headline risk (inflation / tariff / rates). "
            "Event tier MEDIUM — wider bands prudent."
        )

    if news_count > 0 and avg_score <= -0.35:
        penalty += 0.10
        warnings.append(
            f"📉 Strongly negative news tone (avg {avg_score:.2f}). "
            "Model confidence trimmed."
        )
    elif news_count > 0 and avg_score >= 0.35:
        warnings.append(
            f"📈 Constructive news tone (avg {avg_score:.2f}). "
            "Bias supportive but not overriding price action."
        )

    total_penalty = min(penalty, 0.65)
    adjusted = round(max(0.10, base_confidence - total_penalty), 2)

    news_event = max_event >= 1 or (news_count > 0 and abs(avg_score) >= 0.35)
    combined_event = is_event or news_event

    if alert == "danger" or max_event >= 2:
        market_alert: AlertLevel = "danger"
    elif alert == "warning" or max_event >= 1 or is_event:
        market_alert = "warning"
    elif alert == "caution" or (news_count > 0 and abs(avg_score) >= 0.25):
        market_alert = "caution"
    else:
        market_alert = "normal"

    sent_label = _aggregate_sentiment_label(avg_score)

    return {
        "adjusted_confidence": adjusted,
        "market_alert": market_alert,
        "warnings": warnings,
        "event_detected": combined_event,
        "spike_ratio": spike,
        "sentiment_applied": news_count > 0,
        "sentiment_score": round(avg_score, 4),
        "sentiment_label": sent_label,
        "max_event": max_event,
        "news_count": news_count,
    }
