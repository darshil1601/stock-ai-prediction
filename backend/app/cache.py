"""
cache.py — Upstash Redis cache helpers for multi-symbol support
"""
import json
import os
from dotenv import load_dotenv
from upstash_redis import Redis

load_dotenv()

# In-memory fallback dictionary when Redis is not configured
_memory_cache = {}
_memory_ttls = {}

def _get_redis() -> Redis | None:
    """Lazy Redis init — falls back to memory if secrets are missing."""
    url = os.environ.get("UPSTASH_REDIS_REST_URL")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        return None
    try:
        return Redis(url=url, token=token)
    except Exception:
        return None

# Singleton Redis instance
_redis_instance: Redis | None = None
_redis_checked: bool = False

def _get_redis_client() -> Redis | None:
    global _redis_instance, _redis_checked
    if not _redis_checked:
        _redis_instance = _get_redis()
        _redis_checked = True
    return _redis_instance

class _RedisProxy:
    def setex(self, key, time_secs, value):
        client = _get_redis_client()
        if client:
            try:
                return client.setex(key, time_secs, value)
            except Exception:
                pass
        _memory_cache[key] = value

    def get(self, key):
        client = _get_redis_client()
        if client:
            try:
                return client.get(key)
            except Exception:
                pass
        return _memory_cache.get(key)

    def delete(self, key):
        client = _get_redis_client()
        if client:
            try:
                return client.delete(key)
            except Exception:
                pass
        _memory_cache.pop(key, None)

    def ping(self):
        client = _get_redis_client()
        if client:
            return client.ping()
        return "PONG (memory)"

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
