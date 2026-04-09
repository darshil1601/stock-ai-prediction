"""
Rule-based macro event detection from news text.
"""
from __future__ import annotations

import re
from typing import Literal

EventFlag = Literal[0, 1, 2]

_WAR = re.compile(
    r"\b(war|wars|warfare|attack|attacks|invade|invasion|missile|airstrike|"
    r"conflict|combat|military strike|troops|bombing|terror)\b",
    re.I,
)
_MACRO = re.compile(
    r"\b(inflation|cpi|consumer price|interest rate|rate hike|rate cut|fed funds|"
    r"federal reserve|ecb rate|central bank|monetary policy|recession)\b",
    re.I,
)
_TARIFF = re.compile(r"\b(tariff|tariffs|trade war|sanctions|embargo)\b", re.I)


def detect_event(title: str, description: str) -> tuple[EventFlag, str]:
    text = f"{title or ''} {description or ''}".strip()
    if not text:
        return 0, "none"

    if _WAR.search(text):
        return 2, "war"
    if _TARIFF.search(text):
        return 1, "tariff"
    if _MACRO.search(text):
        return 1, "inflation"
    return 0, "none"


def max_event_tier(max_event: int | None) -> Literal["LOW", "MEDIUM", "HIGH"]:
    if max_event is None:
        return "LOW"
    if max_event >= 2:
        return "HIGH"
    if max_event >= 1:
        return "MEDIUM"
    return "LOW"
