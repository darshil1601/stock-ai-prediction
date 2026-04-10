# Railway Deployment Guide — AI Stock Prediction API

## Overview

This guide explains how to deploy the lightweight API tier (`main_api.py`) to Railway's free tier.

### Architecture

- **main_api.py** — Inference-only FastAPI service (no scheduler)
- **models/** — Pre-trained LSTM models (loaded lazily on first prediction)
- **requirements.txt** — Cleaned dependencies (no apscheduler, torch, transformers)
- **Heavy ML training** — Handled separately (Kaggle/Colab), uploaded to `/models` folder

---

## Deployment Steps

### 1. Create Railway Project

```bash
# Login to Railway
railway login

# Create new project in current directory
railway init
```

### 2. Set Environment Variables

In Railway Dashboard, add these environment variables:

```
PORT=8000
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-domain.com

# Supabase (required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-key

# Redis (required for caching)
REDIS_URL=redis://your-redis-instance
# OR for Upstash Redis
UPSTASH_REDIS_URL=redis://:your-token@your-upstash-instance

# Twelve Data API (required for live prices)
TWELVE_DATA_API_KEY=your-twelve-data-key

# Optional: Enable cache bypass for debugging
# DISABLE_CACHE=0
```

### 3. Set Start Command

In Railway Dashboard → Deploy → Settings:

**Start Command:**

```
uvicorn main_api:app --host 0.0.0.0 --port $PORT
```

**Health Check URL:**

```
GET /healthz
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Deploy

```bash
railway up
```

Or push to GitHub and enable GitHub integration in Railway.

---

## Pre-Deployment Checklist

✅ Verify all `.h5` model files exist in `/backend/models/`:

- `xauusd_lstm_model.h5`
- `eurusd_lstm_model.h5`
- `btcusd_lstm_model.h5`

✅ Verify all `.pkl` scaler files exist in `/backend/models/`:

- `xauusd_scaler.pkl`
- `eurusd_scaler.pkl`
- `btcusd_scaler.pkl`

✅ Test locally:

```bash
uvicorn main_api:app --reload
```

✅ Run health check:

```bash
curl http://localhost:8000/healthz
```

✅ Test prediction endpoint:

```bash
curl http://localhost:8000/api/gold/predict
```

---

## What Changed from main.py

| Feature               | main.py    | main_api.py |
| --------------------- | ---------- | ----------- |
| APScheduler           | ✅ 6 jobs  | ❌ Removed  |
| Background threads    | ✅ Yes     | ❌ Removed  |
| Retrain on startup    | ✅ Yes     | ❌ Removed  |
| News ingestion        | ✅ Yes     | ❌ Removed  |
| Model lazy loading    | ⚠️ Partial | ✅ Full     |
| Startup time          | ~10-30s    | ~1-2s       |
| Railway compatibility | ❌ Crashes | ✅ Works    |
| API endpoints         | ✅ All     | ✅ All      |

---

## API Endpoints

All original endpoints work unchanged:

```
GET  /api/{symbol}/predict       → LSTM prediction (cached 2 min)
POST /api/{symbol}/refresh       → Force re-run prediction
GET  /api/{symbol}/history       → Prediction audit trail
GET  /api/{symbol}/price         → Live price from Twelve Data
GET  /sentiment/{symbol}         → Sentiment summary
GET  /sentiment/{symbol}/model-input
GET  /api/search
GET  /health                     → Dependency health check
GET  /                           → Service info
```

**Valid symbols:** `gold`, `eurusd`, `btc`

---

## Model Loading (Lazy)

First request to `/api/gold/predict`:

1. PredictionService calls `model_loader.get_model('XAU/USD')`
2. TensorFlow loads `xauusd_lstm_model.h5` from disk (first time only)
3. Scaler loads `xauusd_scaler.pkl` from disk (first time only)
4. Subsequent requests use cached model

**Result:** Fast startup (no ML overhead), lazy inference cache (warm model on first use)

---

## Separate ML Training Tier

For retraining, use Railway's one-off jobs or external runners:

```bash
# Run on Kaggle / Colab
python backend/train_all.py

# Upload models to your storage
# Models auto-sync to Railway via Git or artifact upload
```

---

## Monitoring & Troubleshooting

### Check logs:

```bash
railway logs
```

### Test health:

```bash
curl https://your-railway-app.up.railway.app/healthz
```

Expected response:

```json
{
  "status": "ok",
  "services": {
    "supabase": "ok",
    "redis": "ok"
  }
}
```

### Debug prediction:

```bash
curl https://your-railway-app.up.railway.app/api/gold/predict
```

### Check rate limiting:

- Limit: 20 requests/minute per IP
- Returns 429 if exceeded

---

## Performance Notes

- **Startup:** <1 second (no ML initialization)
- **First prediction:** 2-5 seconds (TensorFlow loads model)
- **Subsequent predictions:** 1-2 seconds (model in memory, cached if <2 min old)
- **Memory:** ~300-400 MB base + ~500MB per loaded model
- **Railway free tier:** Sufficient for single instance

---

## FAQ

**Q: Can I still use main.py?**
A: Yes, but only if you run it on a machine with >1GB RAM and patience for slow startup. main_api.py is optimized for Railway constraints.

**Q: Where does the scheduler run?**
A: Removed for Railway. Run reconciliation separately via:

- Supabase Edge Functions (cron)
- Separate Railway cron job
- External orchestrator (Zapier, Make)

**Q: Can I retrain models on Railway?**
A: No. Run `train_all.py` on Kaggle/Colab, upload models to Git, Railway auto-deploys.

**Q: What if models fail to load?**
A: Check `/healthz` returns error. Verify model files exist in `/backend/models/`. Models must have matching scaler .pkl files.

---

## Support

- Railway Docs: https://docs.railway.app
- FastAPI Docs: https://fastapi.tiangolo.com
- TensorFlow Serving: Consider for future scaling
