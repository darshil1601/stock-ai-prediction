# Frontend ↔ Backend Integration

Development setup assumes both frontend (Vite) and backend (FastAPI) run locally.

1. Start backend (FastAPI):

```powershell
cd "d:/Stock Prediction/backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn search_api:app --reload --port 8000
```

2. Start frontend (Vite):

```bash
cd "d:/Stock Prediction/frontend"
npm install
npm run dev
```

The frontend Vite server proxies `/api` to `http://localhost:8000` (see `vite.config.ts`).

If deploying to production, point frontend API calls to your production API URL (use `import.meta.env.VITE_API_BASE`).
