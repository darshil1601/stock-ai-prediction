"""
Aggregate feature vector for downstream model extensions.
"""
from __future__ import annotations

from typing import Any


def build_model_feature_vector(
    price: float,
    volume: float,
    sentiment_summary: dict[str, Any] | None,
) -> list[float]:
    if sentiment_summary:
        avg = float(sentiment_summary.get("avg_sentiment") or 0.0)
        max_event = float(sentiment_summary.get("max_event") or 0.0)
    else:
        avg = 0.0
        max_event = 0.0
    return [float(price), float(volume), avg, max_event]
