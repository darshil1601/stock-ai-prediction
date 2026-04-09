"""
model_loader.py — Load trained LSTM model + scaler from disk for a specific symbol.
"""
import os
import joblib

_MODELS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "models"))

# Cache for loaded models and scalers
_models = {}
_scalers = {}

def get_model_path(symbol: str) -> str:
    # Slugify symbol (e.g., XAU/USD -> xauusd)
    slug = symbol.replace("/", "").lower()
    return os.path.join(_MODELS_DIR, f"{slug}_lstm_model.h5")

def get_scaler_path(symbol: str) -> str:
    slug = symbol.replace("/", "").lower()
    return os.path.join(_MODELS_DIR, f"{slug}_scaler.pkl")

def get_model(symbol: str = "XAU/USD"):
    global _models
    if symbol not in _models:
        from tensorflow.keras.models import load_model  # lazy import
        path = get_model_path(symbol)

        if not os.path.exists(path):
            raise FileNotFoundError(f"No model found for {symbol} at {path}")
        _models[symbol] = load_model(path)
    return _models[symbol]

def get_scaler(symbol: str = "XAU/USD"):
    global _scalers
    if symbol not in _scalers:
        path = get_scaler_path(symbol)

        if not os.path.exists(path):
            raise FileNotFoundError(f"No scaler found for {symbol} at {path}")
        _scalers[symbol] = joblib.load(path)
    return _scalers[symbol]

def is_model_ready(symbol: str = "XAU/USD") -> bool:
    m_path = get_model_path(symbol)
    s_path = get_scaler_path(symbol)
    return os.path.exists(m_path) and os.path.exists(s_path)
