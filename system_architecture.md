# System Architecture Overview

This document provides visual diagrams of the AI Stock Prediction System, detailing how the distinct modules communicate with each other.

## High-Level System Flow

This flowchart illustrates the primary components of the system and how user requests travel through the stack to generate machine learning predictions.

```mermaid
graph TD
    classDef frontend fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#e2e8f0
    classDef backend fill:#1e293b,stroke:#10b981,stroke-width:2px,color:#e2e8f0
    classDef storage fill:#1e293b,stroke:#f59e0b,stroke-width:2px,color:#e2e8f0
    classDef external fill:#1e293b,stroke:#8b5cf6,stroke-width:2px,color:#e2e8f0

    User(("User Viewer")):::frontend
    
    subgraph "Client Layer (React / TypeScript)"
        UI["Web App (Vite)"]:::frontend
        TV["TradingView Widgets"]:::frontend
    end
    
    subgraph "AI Backend Layer (Python / FastAPI)"
        API["FastAPI App Router"]:::backend
        Feat["Feature Engineering (Pandas)"]:::backend
        LSTM["TensorFlow (LSTM Models)"]:::backend
        NLP["FinBERT (Sentiment Analyzer)"]:::backend
        Sched["Cron Automation / Scheduler"]:::backend
    end
    
    subgraph "Data & Storage Layer"
        Redis[("Upstash Redis (Cache)")]:::storage
        Supa[("Supabase (PostgreSQL)")]:::storage
    end
    
    subgraph "External Providers"
        Twelve["Twelve Data (OHLCV)"]:::external
        News["News APIs (GDELT)"]:::external
    end

    User -->|"Interacts with UI"| UI
    UI -->|"Live Prices bypass backend"| TV
    
    UI -->|"Requests AI Forecast"| API
    
    API -->|"1. Check fast cache"| Redis
    API -->|"2. Run Prediction Pipeline"| LSTM
    
    LSTM -->|"Pull History"| Twelve
    LSTM -->|"Process Math"| Feat
    
    Sched -->|"Auto-ingest News"| NLP
    NLP -->|"Fetch Global News"| News
    NLP -->|"Save bias score"| Supa
    
    LSTM -->|"Merge Math & Sentiment"| NLP
    LSTM -->|"Save Audit Log"| Supa
    LSTM -->|"Cache next 2 mins"| Redis
    LSTM -->|"Return to UI"| API
```

---

## Prediction Request Sequence

This sequence diagram takes a closer look at exactly what happens inside the system when a user triggers the `/api/{symbol}/predict` endpoint. It highlights the protective caching layer and how the system prevents API exhaustion.

```mermaid
sequenceDiagram
    participant UI as React Frontend
    participant API as FastAPI Router
    participant Cache as Upstash Redis
    participant Core as Prediction Service
    participant TD as Twelve Data API
    participant DB as Supabase DB

    UI->>API: GET /api/btc/predict
    
    API->>Cache: Check for 'predict:btcusd'
    
    alt Cache Hits
        Cache-->>API: Return cached JSON payload
        API-->>UI: Instantly return AI Prediction
    else Cache Misses (or Expired)
        Cache-->>API: Return None
        API->>Core: run_prediction("BTC/USD")
        
        Core->>TD: Fetch 500 rows OHLCV history
        TD-->>Core: Raw candlestick data
        
        Note over Core: Pandas runs technical indicators<br/>(MACD, RSI, Volatility Bands)
        Note over Core: TensorFlow scales data & runs LSTM
        
        Core->>DB: Fetch latest FinBERT sentiment score
        DB-->>Core: Bullish (+0.65 bias)
        
        Note over Core: Blends LSTM output with Sentiment
        
        Core->>DB: Save prediction to Audit Log table
        Core->>Cache: Save final JSON for 2 minutes
        Core-->>API: Return final payload dict
        
        API-->>UI: Return AI Prediction
    end
```
