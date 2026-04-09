"""Map news text to tracked symbols (news_sentiment.symbol)."""
from __future__ import annotations

import re

_BTC = re.compile(r"\b(bitcoin|btc|crypto bitcoin)\b", re.I)
_GOLD = re.compile(r"\b(gold|xau|xauusd|spot gold)\b", re.I)
_EUR = re.compile(r"\b(eurusd|eur\/usd|euro dollar|euro fx)\b", re.I)


def detect_symbols(title: str, description: str) -> list[str]:
    text = f"{title} {description}"
    out: list[str] = []
    if _BTC.search(text):
        out.append("BTC")
    if _GOLD.search(text):
        out.append("GOLD")
    if _EUR.search(text):
        out.append("EURUSD")
    if not out:
        out.append("GOLD")
    return list(dict.fromkeys(out))
