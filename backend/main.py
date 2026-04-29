"""
main.py — FastAPI entry point with APScheduler for automatic daily reconciliation
"""
import os
import logging
import logging.config
import threading
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from datetime import timezone

# Load .env before any app imports
load_dotenv()

# Silence specific noisy loggers
os.environ["TF_USE_LEGACY_KERAS"] = "1"
logging.getLogger("tensorflow").setLevel(logging.ERROR)
logging.getLogger("absl").setLevel(logging.ERROR)
logging.getLogger("apscheduler").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

# ── Supress Noisy AI Libraries (TensorFlow, Abseil) ───────────────────────────
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"  # 0=all, 1=no info, 2=no warnings, 3=no errors
os.environ["TF_USE_LEGACY_KERAS"] = "1"

# ── Structured Logging Setup ──────────────────────────────────────────────────
# Using a cleaner, more readable format for the terminal
logging.basicConfig(
    level=logging.INFO,
    format="\033[94m%(asctime)s\033[0m %(levelname)-8s \033[95m%(name)s\033[0m — %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("main")

def print_banner():
    banner = """
    \033[92m
    ┌─────────────────────────────────────────────────────────┐
    │  🚀 AI STOCK PREDICTION ENGINE — BACKEND ACTIVE         │
    │  💡 Monitoring: Gold, Forex, Crypto                     │
    │  📈 Status: All Systems Operational                     │
    └─────────────────────────────────────────────────────────┘
    \033[0m
    """
    print(banner)

# ── CORS Config (read from env, restrict in production) ───────────────────────
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]
logger.info(f"[CORS] Allowed origins: {ALLOWED_ORIGINS}")

from app.api.prediction import router as prediction_router
from app.api.sentiment import router as sentiment_router
from app.api.search_api import router as search_router
from app.services.training.retrain_service import (
    auto_retrain_enabled,
    check_and_trigger_event_retrain,
    wait_for_training,
)

# ── Scheduler Setup (Global UTC) ───────────────────────
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

scheduler = BackgroundScheduler(timezone=timezone.utc)


def run_reconcile_job():
    """
    Auto-reconcile all past predictions with actual market prices.
    Runs on a schedule — after market closes IST time.
    """
    try:
        from app.database import reconcile_predictions
        logger.info("[Scheduler] Running reconcile_predictions...")
        reconcile_predictions()
        logger.info("[Scheduler] Reconciliation complete.")
    except Exception as e:
        logger.error(f"[Scheduler] Reconcile failed: {e}", exc_info=True)


def run_cache_clear_job():
    """
    Clear prediction cache daily at midnight IST so that at the start of
    each new trading day, fresh predictions are generated with correct dates.
    """
    try:
        from app import cache as redis_cache
        for sym in ["xauusd", "eurusd", "btcusd"]:
            key = f"predict:{sym}"
            redis_cache._redis.delete(key)
        logger.info("[Scheduler] Prediction cache cleared for new trading day.")
    except Exception as e:
        logger.error(f"[Scheduler] Cache clear failed: {e}", exc_info=True)


def run_daily_predictions():
    """
    Auto-run LSTM predictions for all symbols daily after market open.
    Ensures fresh BUY/SELL/HOLD signals are available without user intervention.
    Runs at 05:30 UTC = 11:00 IST (after Asian open, before EU open).
    """
    from app.services.prediction_service import run_prediction
    SYMBOLS = ["XAU/USD", "EUR/USD", "BTC/USD"]

    logger.info("[Scheduler] Prediction refresh START")
    if not wait_for_training(timeout=600):
        logger.warning("[Scheduler] Prediction refresh skipped because training is still active.")
        return

    for sym in SYMBOLS:
        try:
            # Clear cache first so fresh data is used
            from app import cache as redis_cache
            cache_key = f"predict:{sym.replace('/', '').lower()}"
            redis_cache._redis.delete(cache_key)
            # Run fresh prediction
            result = run_prediction(sym)
            signal = result.get("signal", "?")
            price  = result.get("next_price", "?")
            logger.info(f"[Scheduler] Daily predict OK — {sym}: signal={signal}, next={price}")
        except Exception as e:
            logger.error(f"[Scheduler] Daily predict FAILED for {sym}: {e}", exc_info=True)
    logger.info("[Scheduler] Prediction refresh END")


def run_news_ingestion_job():
    try:
        from app.services.news_pipeline import run_news_ingestion

        stats = run_news_ingestion()
        logger.info("[Scheduler] News ingestion: %s", stats)
    except Exception as e:
        logger.error("[Scheduler] News ingestion failed: %s", e, exc_info=True)


def run_full_retrain_job():
    """
    Executes a full LSTM retrain for all 3 symbols.
    Triggered weekly or by emergency market events.
    """
    if os.environ.get("ENABLE_AUTO_RETRAIN", "").lower() not in ("1", "true", "yes"):
        logger.info("[Scheduler] Weekly retrain skipped — ENABLE_AUTO_RETRAIN is not set")
        return
    try:
        from app.services.training.retrain_service import retrain_model

        logger.info("[Scheduler] Weekly retrain START")
        retrain_model(async_start=False)
        logger.info("[Scheduler] Weekly retrain END")
    except Exception as e:
        logger.error(f"[Scheduler] Weekly retrain failed: {e}", exc_info=True)


def run_startup_jobs():
    """
    Startup maintenance is serialized so reconciliation, retraining,
    prediction refresh, and news ingestion never overlap.
    """
    logger.info("[Scheduler] Startup maintenance sequence START")
    started = time.monotonic()
    try:
        run_reconcile_job()
        run_full_retrain_job()
        run_daily_predictions()
        run_news_ingestion_job()
    finally:
        logger.info(
            "[Scheduler] Startup maintenance sequence END (%.1fs)",
            time.monotonic() - started,
        )
# ── Schedule Jobs (UTC — Financial Standard) ──────────────────────────────────
#
# Gold Spot and Forex close at 5:00 PM EST = 21:00 or 22:00 UTC.
# We run reconciliation and cache clearing after the market close.
# ─────────────────────────────────────────────────────────────────────────────

# Job 1: Clear prediction cache at 21:05 UTC — right after daily close
scheduler.add_job(
    run_cache_clear_job,
    CronTrigger(hour=21, minute=5, timezone=timezone.utc),
    id="cache_clear_2105_utc",
    name="Post-Market Cache Clear (UTC)",
    replace_existing=True,
)

# Job 2: Primary reconcile at 21:30 UTC — 30 min after close
scheduler.add_job(
    run_reconcile_job,
    CronTrigger(hour=21, minute=30, timezone=timezone.utc),
    id="reconcile_2130_utc",
    name="Primary Reconcile (UTC)",
    replace_existing=True,
)

# Job 3: Safety reconcile at 05:00 UTC
scheduler.add_job(
    run_reconcile_job,
    CronTrigger(hour=5, minute=0, timezone=timezone.utc),
    id="reconcile_0500_utc",
    name="Morning Safety Reconcile (UTC)",
    replace_existing=True,
)

# Job 4: Daily auto-prediction at 01:30 UTC = 07:00 AM IST (Early Morning)
# Runs LSTM for all symbols so fresh BUY/SELL/HOLD signal is always ready
scheduler.add_job(
    run_daily_predictions,
    CronTrigger(hour=1, minute=30, timezone=timezone.utc),
    id="daily_prediction_0130_utc",
    name="Daily LSTM Prediction — All Symbols (UTC)",
    replace_existing=True,
)

# Job 5: Weekly Full Retrain at Sunday 23:00 UTC
# Recalibrates models for new market regimes
scheduler.add_job(
    run_full_retrain_job,
    CronTrigger(day_of_week="sun", hour=23, minute=0, timezone=timezone.utc),
    id="weekly_retrain_sun_2300_utc",
    name="Weekly Deep Learning Retrain — All Symbols (UTC)",
    replace_existing=True,
)

# Job 6: Event-based retrain check (Every 30 minutes)
scheduler.add_job(
    check_and_trigger_event_retrain,
    IntervalTrigger(minutes=30),
    id="event_retrain_check_30m",
    name="Macro Event Retrain Check (30 min)",
    replace_existing=True,
)

# Job 7: News + sentiment pipeline (NewsAPI + GDELT → FinBERT → Supabase)
_news_mins = int(os.environ.get("NEWS_INGEST_INTERVAL_MINUTES", "1") or "1")
_news_mins = max(1, min(_news_mins, 60))
scheduler.add_job(
    run_news_ingestion_job,
    IntervalTrigger(minutes=_news_mins),
    id="news_ingestion_interval",
    name=f"News & Sentiment Ingestion ({_news_mins} min)",
    replace_existing=True,
)

# ── Lifespan (startup + shutdown) ─────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    print_banner()
    scheduler.start()
    logger.info("[Scheduler] Started — Running on UTC Standard (21:05, 21:30, 05:00 UTC)")

    if os.environ.get("STARTUP_BACKGROUND_JOBS", "1").lower() in ("1", "true", "yes"):
        threading.Thread(
            target=run_startup_jobs,
            daemon=True,
            name="startup-maintenance",
        ).start()
        logger.info("[Scheduler] Startup maintenance sequence triggered in background.")
    else:
        logger.info(
            "[Scheduler] Startup background jobs skipped (STARTUP_BACKGROUND_JOBS=0) — quieter dev"
        )

    yield

    # SHUTDOWN
    scheduler.shutdown(wait=False)
    logger.info("[Scheduler] Stopped.")


# ── App ───────────────────────────────────────────────
app = FastAPI(
    title="AI Stock Prediction Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Hugging Face / Cloud PORT handling
port = int(os.environ.get("PORT", 7860))

# Event-triggered retrain endpoint
@app.post("/retrain")
def trigger_retrain():
    """
    POST /retrain — Manual or webhook-triggered full LSTM retrain.
    Call from GitHub Actions / Supabase Edge / Zapier on volatility spike (2x vol),
    major news/tariffs/events. Requires RETRAIN_ON_EVENTS=1.
    """
    from app.services.training.retrain_service import retrain_model
    if not auto_retrain_enabled():  # Reuse from retrain_service
        return {"error": "Auto-retrain disabled (ENABLE_AUTO_RETRAIN=1)"}
    threading.Thread(target=retrain_model, args=(False,), daemon=True).start()
    return {"status": "retrain started async (non-blocking)"}


# ── CORS — restricted to known frontend origins ───────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Rate Limiting (slowapi) — 20 req/min per IP ───────
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded

    limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    logger.warning("[RateLimit] slowapi limiter active — 20 req/min per IP")
except ImportError:
    logger.warning("⚠️  [RateLimit] Limit not active (Optional: pip install slowapi)")

# ── Routers ───────────────────────────────────────────
app.include_router(prediction_router)   # /api/{symbol}/predict  /api/{symbol}/price  /api/{symbol}/refresh
app.include_router(sentiment_router)    # /sentiment/{symbol}  /sentiment/{symbol}/model-input
app.include_router(search_router)       # /api/search

# ── Health Check — verifies all dependencies ──────────
@app.get("/health")
@app.get("/healthz")
def health():
    """Dependency health check. Returns 200 if all services are reachable."""
    from app import cache as redis_cache
    from app.database import supabase

    checks: dict[str, str] = {}

    # Check Supabase
    try:
        supabase.table("predictions").select("id").limit(1).execute()
        checks["supabase"] = "ok"
    except Exception as e:
        checks["supabase"] = f"error: {e}"
        logger.error(f"[Health] Supabase check failed: {e}")

    # Check Redis
    try:
        redis_cache._redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"
        logger.error(f"[Health] Redis check failed: {e}")

    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    return {"status": overall, "services": checks}


# ── Root Info ─────────────────────x────────────────────
@app.get("/")
def root():
    jobs = [
        {"id": j.id, "name": j.name, "next_run": str(j.next_run_time)}
        for j in scheduler.get_jobs()
    ]
    return {
        "status": "running",
        "service": "AI Stock Prediction",
        "version": "1.0.0",
        "scheduler": "active",
        "scheduled_jobs": jobs,
        "endpoints": [
            "GET  /api/{symbol}/predict   → LSTM prediction (cached 2 min)",
            "POST /api/{symbol}/refresh   → Force clear cache & re-run LSTM",
            "GET  /api/{symbol}/history   → Prediction audit log",
            "GET  /api/{symbol}/price     → Live price from Twelve Data",
            "GET  /sentiment/{symbol}     → FinBERT aggregate (sentiment_summary)",
            "GET  /health                 → Dependency health check",
        ],
    }
