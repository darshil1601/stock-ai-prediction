"""
twelve_fetcher.py - Twelve Data helpers for prediction-only market history.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone

import pandas as pd
import requests
from dotenv import load_dotenv

from app.services.asset_profile import resolve_history_interval

load_dotenv()

logger = logging.getLogger(__name__)

API_KEY: str = os.environ["TWELVE_DATA_KEY"]
BASE_URL = "https://api.twelvedata.com"


def fetch_historical_data(
    symbol: str,
    outputsize: int = 5000,
    interval: str | None = None,
) -> pd.DataFrame:
    """
    Returns a DataFrame with columns:
      date (str), open, high, low, close, volume
    Sorted oldest -> newest.
    """
    candle_interval = interval or resolve_history_interval(symbol, datetime.now(timezone.utc))

    # Twelve Data naturally aligns 4h candles to NY midnight (05:00 UTC).
    # To match TradingView (00:00 UTC alignment for crypto), we fetch 1h and resample.
    is_crypto_4h = "BTC" in symbol and candle_interval == "4h"
    fetch_interval = "1h" if is_crypto_4h else candle_interval
    fetch_size = min(5000, outputsize * 4) if is_crypto_4h else outputsize

    url = f"{BASE_URL}/time_series"
    params = {
        "symbol": symbol,
        "interval": fetch_interval,
        "outputsize": fetch_size,
        "apikey": API_KEY,
        "timezone": "UTC"
    }
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
    except requests.Timeout as exc:
        raise RuntimeError(f"Twelve Data API timed out for {symbol}") from exc
    except requests.RequestException as exc:
        raise RuntimeError(f"Twelve Data network error for {symbol}: {exc}") from exc

    data = resp.json()
    if "values" not in data:
        raise RuntimeError(f"Twelve Data error for {symbol}: {data.get('message', data)}")

    df = pd.DataFrame(data["values"])
    df = df.iloc[::-1].reset_index(drop=True)

    for col in ["open", "high", "low", "close"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    if "volume" in df.columns:
        df["volume"] = pd.to_numeric(df["volume"], errors="coerce").fillna(0).astype(int)
    else:
        df["volume"] = 0

    df = df.rename(columns={"datetime": "date"})
    
    if is_crypto_4h:
        df["date"] = pd.to_datetime(df["date"])
        df.set_index("date", inplace=True)
        # Resample 1h to 4h aligned to 00:00 UTC (TradingView standard)
        resampled = df.resample("4h", closed="left", label="left").agg({
            "open": "first",
            "high": "max",
            "low": "min",
            "close": "last",
            "volume": "sum"
        })
        resampled.dropna(inplace=True)
        df = resampled.reset_index()
        df["date"] = df["date"].dt.strftime("%Y-%m-%d %H:%M:%S")

    df["date"] = df["date"].astype(str)
    
    # If we fetched extra data to resample, trim back to requested size
    if is_crypto_4h and len(df) > outputsize:
        df = df.tail(outputsize).reset_index(drop=True)
        
    return df[["date", "open", "high", "low", "close", "volume"]]


def fetch_live_quote(symbol: str) -> dict:
    """
    Returns dict: { symbol, price, change, change_pct, timestamp }
    This endpoint is retained for backend diagnostics and reconciliation only.
    """
    url = f"{BASE_URL}/price"
    params = {"symbol": symbol, "apikey": API_KEY}
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    price_data = resp.json()

    quote_url = f"{BASE_URL}/quote"
    q = requests.get(quote_url, params=params, timeout=10).json()

    price = float(price_data.get("price", 0))
    prev_close = float(q.get("previous_close", price))
    change = round(price - prev_close, 4)
    change_pct = round((change / prev_close * 100) if prev_close else 0, 3)

    return {
        "symbol": symbol,
        "name": q.get("name", symbol),
        "price": round(price, 4),
        "change": change,
        "change_pct": change_pct,
        "prev_close": round(prev_close, 4),
        "timestamp": q.get("datetime", ""),
    }
