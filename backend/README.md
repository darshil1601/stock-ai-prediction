# Backend (FastAPI) — Local run instructions

This directory contains a small example FastAPI search endpoint used by the frontend during development.

Quick start:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn search_api:app --reload --port 8000
```

The frontend development server is configured to proxy `/api` to `http://localhost:8000`.

Replace the in-memory `_DATA` in `search_api.py` with a real PostgreSQL-backed query for production (use indexing / full text search).
