"""
main_api.py — FastAPI entry point optimized for Railway free tier
- NO APScheduler
- NO background jobs or threading
- NO heavy ML initialization at startup
- Models load lazily only when /predict is called
- Lightweight API-only service
"""
import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env before any app imports
load_dotenv()

# ── Suppress Noisy AI Libraries ────────────────────────────────────────────────
# These only activate if TensorFlow is imported (which happens lazily in prediction_service)
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

# ── Logging Setup ──────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="\033[94m%(asctime)s\033[0m %(levelname)-8s \033[95m%(name)s\033[0m — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("main_api")

# Silence non-critical logs (only if those libraries get loaded)
logging.getLogger("httpx").setLevel(logging.WARNING)


def print_banner():
    banner = """
    \033[92m
    ┌─────────────────────────────────────────────────────────┐
    │  🚀 AI STOCK PREDICTION API — RAILWAY OPTIMIZED         │
    │  💡 Lightweight API Gateway (ML Inference Only)         │
    │  📈 Status: All Systems Ready                           │
    └─────────────────────────────────────────────────────────┘
    \033[0m
    """
    print(banner)


# ── CORS Configuration ─────────────────────────────────────────────────────────
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
logger.info(f"[CORS] Allowed origins: {ALLOWED_ORIGINS}")

# ── Import routers (lightweight, no heavy dependencies) ─────────────────────────
from app.api.prediction import router as prediction_router
from app.api.sentiment import router as sentiment_router
from app.api.search_api import router as search_router


# ── Lifespan handler (startup/shutdown only) ───────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    print_banner()
    logger.info("[Startup] API initialized — ready for requests")
    logger.info("[Startup] Models load on-demand (lazy) when first prediction is called")

    yield

    # SHUTDOWN
    logger.info("[Shutdown] Gracefully shutting down")


# ── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Stock Prediction Backend (Railway)",
    description="Lightweight API gateway for LSTM predictions",
    version="1.0.0",
    lifespan=lifespan,
)

# Railway PORT handling
port = int(os.environ.get("PORT", 8000))


# ── CORS Middleware ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


# ── Rate Limiting (slowapi) ────────────────────────────────────────────────────
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded

    limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    logger.info("[RateLimit] Enabled — 20 req/min per IP")
except ImportError:
    logger.warning("[RateLimit] Optional slowapi not installed (non-critical)")


# ── API Routers ────────────────────────────────────────────────────────────────
# Includes all existing endpoints:
#   GET  /api/{symbol}/predict       → LSTM prediction (cached 2 min)
#   POST /api/{symbol}/refresh       → Force clear cache + re-run
#   GET  /api/{symbol}/history       → Prediction audit log
#   GET  /api/{symbol}/price         → Live quote from Twelve Data
#   GET  /sentiment/{symbol}         → FinBERT sentiment + events
#   GET  /sentiment/{symbol}/model-input
#   GET  /api/search
app.include_router(prediction_router)
app.include_router(sentiment_router)
app.include_router(search_router)


# ── Health Checks (Dependency Verification) ────────────────────────────────────
@app.get("/health")
@app.get("/healthz")
def health():
    """
    Verifies that all required services (Supabase, Redis) are reachable.
    Returns 200 if OK, 503 if degraded.
    
    Note: TensorFlow models are NOT checked here — they load lazily on first /predict call.
    """
    from app import cache as redis_cache
    from app.database import supabase

    checks: dict[str, str] = {}

    # Check Supabase connectivity
    try:
        supabase.table("predictions").select("id").limit(1).execute()
        checks["supabase"] = "ok"
    except Exception as e:
        checks["supabase"] = f"error: {e}"
        logger.error(f"[Health] Supabase check failed: {e}")

    # Check Redis connectivity
    try:
        redis_cache._redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        logger.error(f"[Health] Redis check failed: {e}")

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    status_code = 200 if overall == "ok" else 503
    
    return {"status": overall, "services": checks}


# ── Root Info Endpoint ─────────────────────────────────────────────────────────
@app.get("/")
def root():
    """
    Service info and available endpoints.
    No scheduler info (scheduler removed for Railway compatibility).
    """
    return {
        "status": "running",
        "service": "AI Stock Prediction API",
        "version": "1.0.0",
        "environment": "railway-optimized",
        "note": "Models load lazily on first request (no startup ML overhead)",
        "endpoints": {
            "predictions": [
                "GET  /api/{symbol}/predict   → LSTM prediction (cached 2 min)",
                "POST /api/{symbol}/refresh   → Force clear cache & re-run LSTM",
                "GET  /api/{symbol}/history   → Prediction audit log",
                "GET  /api/{symbol}/price     → Live price from Twelve Data",
            ],
            "sentiment": [
                "GET  /sentiment/{symbol}     → FinBERT aggregate (sentiment_summary)",
                "GET  /sentiment/{symbol}/model-input",
            ],
            "search": [
                "GET  /api/search",
            ],
            "health": [
                "GET  /health           → Dependency health check",
                "GET  /healthz          → Alias for /health",
            ],
        },
        "symbols": ["gold", "eurusd", "btc"],
    }
