"""
cache.py — Upstash Redis cache helpers for multi-symbol support
"""
import json
import os
from dotenv import load_dotenv
from upstash_redis import Redis

load_dotenv()

def _get_redis() -> Redis:
    """Lazy Redis init — prevents startup crash when secrets are missing."""
    url = os.environ.get("UPSTASH_REDIS_REST_URL")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        raise RuntimeError("❌ Redis not configured: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN")
    return Redis(url=url, token=token)

# Singleton Redis instance
_redis_instance: Redis | None = None

def _get_redis_client() -> Redis:
    global _redis_instance
    if _redis_instance is None:
        _redis_instance = _get_redis()
    return _redis_instance

# Backward-compat alias used in main.py (_cache._redis.ping() etc.)
class _RedisProxy:
    def __getattr__(self, name):
        return getattr(_get_redis_client(), name)

_redis = _RedisProxy()

# ── TTL constants ────────────────────────────────────────────────
PRICE_TTL      = 60    # seconds
PREDICTION_TTL = 120   # 2 minutes — short so stale date predictions expire fast
HISTORY_TTL    = 3600  # 1 hour


# ── Live price ───────────────────────────────────────────────────
def set_live_price(data: dict, symbol: str = "XAU/USD") -> None:
    key = f"{symbol.replace('/', '').lower()}:live_price"
    _redis.setex(key, PRICE_TTL, json.dumps(data))


def get_live_price(symbol: str = "XAU/USD") -> dict | None:
    key = f"{symbol.replace('/', '').lower()}:live_price"
    raw = _redis.get(key)
    return json.loads(raw) if raw else None


# ── Prediction ───────────────────────────────────────────────────
def set_prediction(data: dict, key: str = None) -> None:
    k = key or "gold:prediction"
    _redis.setex(k, PREDICTION_TTL, json.dumps(data))


def get_prediction(key: str = None) -> dict | None:
    k = key or "gold:prediction"
    raw = _redis.get(k)
    return json.loads(raw) if raw else None


# ── OHLCV history ────────────────────────────────────────────────
def set_history(rows: list, symbol: str = "XAU/USD") -> None:
    key = f"{symbol.replace('/', '').lower()}:history"
    _redis.setex(key, HISTORY_TTL, json.dumps(rows))


def get_history(symbol: str = "XAU/USD") -> list | None:
    key = f"{symbol.replace('/', '').lower()}:history"
    raw = _redis.get(key)
    return json.loads(raw) if raw else None
