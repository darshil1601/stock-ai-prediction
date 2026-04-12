---
title: Stock AI Prediction API
emoji: 📈
colorFrom: indigo
colorTo: blue
sdk: docker
app_file: main.py
pinned: false
---

# 🚀 AI Stock Prediction Backend

FastAPI backend powering multi-symbol LSTM-based stock predictions.

## Supported Symbols
- `XAU/USD` — Gold Spot
- `EUR/USD` — Euro Forex
- `BTC/USD` — Bitcoin

## Endpoints
| Endpoint | Description |
|---|---|
| `GET /api/{symbol}/predict` | LSTM prediction + signal |
| `GET /api/{symbol}/history` | Prediction audit log |
| `GET /api/{symbol}/price` | Live price from Twelve Data |
| `POST /api/{symbol}/refresh` | Force cache clear + re-predict |
| `GET /sentiment/{symbol}` | FinBERT sentiment summary |
| `GET /health` | Dependency health check |

## Stack
- **FastAPI** + **Uvicorn**
- **TensorFlow** LSTM Models
- **Supabase** (PostgreSQL)
- **Upstash Redis** (Caching)
- **Twelve Data** (Market Data)
- **NewsAPI** + **FinBERT** (Sentiment)
