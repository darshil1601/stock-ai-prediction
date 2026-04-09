from fastapi import APIRouter, Query
from typing import List

router = APIRouter(prefix="/search", tags=["search"])

# Example in-memory dataset — replace with DB query in production
_DATA = [
    {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "price": 2456.4, "change_percent": 1.24},
    {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "price": 3200.5, "change_percent": -0.42},
    {"symbol": "INFY", "name": "Infosys Ltd", "price": 1450.0, "change_percent": 0.58},
    {"symbol": "NIFTY 50", "name": "NIFTY 50 Index", "price": 18350.2, "change_percent": 0.12},
]


@router.get("")
def search(q: str = Query(..., min_length=1)):
    """Search for stocks by symbol or name"""
    term = q.strip().lower()
    out = []
    for row in _DATA:
        if term in row["symbol"].lower() or term in row["name"].lower():
            out.append(row)
    return out[:20]
    