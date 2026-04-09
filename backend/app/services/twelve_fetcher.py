"""
twelve_fetcher.py — Twelve Data helpers for Forex & Commodities
"""
import os
import logging
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Fail loudly at startup — NEVER use a hardcoded fallback key in source code
API_KEY: str = os.environ["TWELVE_DATA_KEY"]   # KeyError = misconfigured env, fix .env
BASE_URL = "https://api.twelvedata.com"

def fetch_historical_data(symbol: str, outputsize: int = 5000) -> pd.DataFrame:
    """
    Returns a DataFrame with columns:
      date (str), open, high, low, close, volume  — all float
    Sorted oldest → newest.
    """
    url = f"{BASE_URL}/time_series"
    params = {
        "symbol":     symbol,
        "interval":   "1day",
        "outputsize": outputsize,
        "apikey":     API_KEY,
    }
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
    except requests.Timeout:
        raise RuntimeError(f"Twelve Data API timed out for {symbol}")
    except requests.RequestException as e:
        raise RuntimeError(f"Twelve Data network error for {symbol}: {e}")

    data = resp.json()
    if "values" not in data:
        raise RuntimeError(f"Twelve Data error for {symbol}: {data.get('message', data)}")

    df = pd.DataFrame(data["values"])
    df = df.iloc[::-1].reset_index(drop=True)   # oldest first

    for col in ["open", "high", "low", "close"]:
        df[col] = df[col].astype(float)

    if "volume" in df.columns:
        df["volume"] = pd.to_numeric(df["volume"], errors="coerce").fillna(0).astype(int)
    else:
        df["volume"] = 0
    return df[["datetime", "open", "high", "low", "close", "volume"]].rename(
        columns={"datetime": "date"}
    )

def fetch_live_quote(symbol: str) -> dict:
    """
    Returns dict: { symbol, price, change, change_pct, timestamp }
    """
    url = f"{BASE_URL}/price"
    params = {"symbol": symbol, "apikey": API_KEY}
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    price_data = resp.json()

    # Also fetch EOD quote for change calculation
    quote_url = f"{BASE_URL}/quote"
    q = requests.get(quote_url, params=params, timeout=10).json()

    price     = float(price_data.get("price", 0))
    prev_close = float(q.get("previous_close", price))
    change     = round(price - prev_close, 4)
    change_pct = round((change / prev_close * 100) if prev_close else 0, 3)

    return {
        "symbol":     symbol,
        "name":       q.get("name", symbol),
        "price":      round(price, 4),
        "change":     change,
        "change_pct": change_pct,
        "prev_close": round(prev_close, 4),
        "timestamp":  q.get("datetime", ""),
    }

# ── End of file ──────────────────────────────────────────────────────────────