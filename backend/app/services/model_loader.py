"""
model_loader.py — Load trained LSTM model + scaler from disk for a specific symbol.
"""
import os
import joblib

_MODELS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "models"))

# Cache for loaded models and scalers
_models = {}
_scalers = {}

def get_latest_version(symbol: str) -> str | None:
    """Fetch latest version string from model_info table."""
    try:
        from app.database import get_latest_model_info
        info = get_latest_model_info(symbol)
        if info:
            return info.get("version")
    except Exception as e:
        print(f"Error fetching latest model version for {symbol}: {e}")
    return None


def get_model_path(symbol: str, version: str | None = None) -> str:
    # Slugify symbol (e.g., XAU/USD -> xauusd)
    slug = symbol.replace("/", "").lower()
    if version:
        v_path = os.path.join(_MODELS_DIR, f"{slug}_{version}_lstm_model.h5")
        if os.path.exists(v_path):
            return v_path
    
    # Fallback to generic
    return os.path.join(_MODELS_DIR, f"{slug}_lstm_model.h5")


def get_scaler_path(symbol: str, version: str | None = None) -> str:
    slug = symbol.replace("/", "").lower()
    if version:
        v_path = os.path.join(_MODELS_DIR, f"{slug}_{version}_scaler.pkl")
        if os.path.exists(v_path):
            return v_path
    
    # Fallback to generic
    return os.path.join(_MODELS_DIR, f"{slug}_scaler.pkl")

def get_model(symbol: str = "XAU/USD"):
    global _models
    if symbol not in _models:
        import tensorflow as tf
        from tensorflow.keras.models import load_model  # lazy import

        # ── Keras 3.x / 2.x Compatibility Patch ──────────────────────────────
        # Models saved with Keras 3.x include 'quantization_config' in Dense
        # layer config. Older Keras doesn't recognize this kwarg.
        # Solution: Patch Dense to silently drop unknown kwargs during load.
        class _PatchedDense(tf.keras.layers.Dense):
            def __init__(self, *args, **kwargs):
                kwargs.pop("quantization_config", None)
                super().__init__(*args, **kwargs)

        version = get_latest_version(symbol)
        path = get_model_path(symbol, version)

        if not os.path.exists(path):
            raise FileNotFoundError(f"No model found for {symbol} at {path}")

        print(f"[Loader] Loading model: {os.path.basename(path)}")
        _models[symbol] = load_model(
            path,
            custom_objects={"Dense": _PatchedDense},
            compile=False,
        )
    return _models[symbol]


def get_scaler(symbol: str = "XAU/USD"):
    global _scalers
    if symbol not in _scalers:
        version = get_latest_version(symbol)
        path = get_scaler_path(symbol, version)

        if not os.path.exists(path):
            raise FileNotFoundError(f"No scaler found for {symbol} at {path}")
        
        print(f"[Loader] Loading scaler: {os.path.basename(path)}")
        _scalers[symbol] = joblib.load(path)
    return _scalers[symbol]

def is_model_ready(symbol: str = "XAU/USD") -> bool:
    version = get_latest_version(symbol)
    m_path = get_model_path(symbol, version)
    s_path = get_scaler_path(symbol, version)
    return os.path.exists(m_path) and os.path.exists(s_path)
