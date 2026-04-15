"""
model_loader.py - Version-aware LSTM model and scaler loading.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass

import joblib

_MODELS_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "models"))

_models: dict[str, object] = {}
_scalers: dict[str, object] = {}
_loaded_versions: dict[str, str | None] = {}


@dataclass(frozen=True)
class ArtifactRef:
    symbol: str
    version: str | None
    model_path: str
    scaler_path: str


def get_models_dir() -> str:
    return _MODELS_DIR


def _slug(symbol: str) -> str:
    return symbol.replace("/", "").lower()


def _versioned_model_path(symbol: str, version: str) -> str:
    return os.path.join(_MODELS_DIR, f"{_slug(symbol)}_model_{version}.h5")


def _versioned_scaler_path(symbol: str, version: str) -> str:
    return os.path.join(_MODELS_DIR, f"{_slug(symbol)}_scaler_{version}.pkl")


def _generic_model_path(symbol: str) -> str:
    return os.path.join(_MODELS_DIR, f"{_slug(symbol)}_lstm_model.h5")


def _generic_scaler_path(symbol: str) -> str:
    return os.path.join(_MODELS_DIR, f"{_slug(symbol)}_scaler.pkl")


def get_model_path(symbol: str, version: str | None = None) -> str:
    if version:
        return _versioned_model_path(symbol, version)
    return _generic_model_path(symbol)


def get_scaler_path(symbol: str, version: str | None = None) -> str:
    if version:
        return _versioned_scaler_path(symbol, version)
    return _generic_scaler_path(symbol)


def build_versioned_artifact_ref(symbol: str, version: str) -> ArtifactRef:
    return ArtifactRef(
        symbol=symbol,
        version=version,
        model_path=_versioned_model_path(symbol, version),
        scaler_path=_versioned_scaler_path(symbol, version),
    )


def _local_versions(symbol: str) -> list[str]:
    slug = _slug(symbol)
    if not os.path.isdir(_MODELS_DIR):
        return []

    model_pattern = re.compile(rf"^{re.escape(slug)}_model_(v\d+)\.h5$")
    scaler_pattern = re.compile(rf"^{re.escape(slug)}_scaler_(v\d+)\.pkl$")

    model_versions = {
        match.group(1)
        for name in os.listdir(_MODELS_DIR)
        for match in [model_pattern.match(name)]
        if match
    }
    scaler_versions = {
        match.group(1)
        for name in os.listdir(_MODELS_DIR)
        for match in [scaler_pattern.match(name)]
        if match
    }
    return sorted(model_versions & scaler_versions)


def _artifact_exists(symbol: str, version: str) -> bool:
    ref = build_versioned_artifact_ref(symbol, version)
    return os.path.exists(ref.model_path) and os.path.exists(ref.scaler_path)


def _fetch_db_version(symbol: str) -> str | None:
    try:
        from app.database import get_latest_model_info

        info = get_latest_model_info(symbol)
        if info:
            return info.get("version")
    except Exception as exc:
        print(f"Error fetching latest model version for {symbol}: {exc}")
    return None


def get_latest_version(symbol: str) -> str | None:
    db_version = _fetch_db_version(symbol)
    if db_version and _artifact_exists(symbol, db_version):
        return db_version

    local_versions = _local_versions(symbol)
    if local_versions:
        return local_versions[-1]

    return None


def get_loaded_version(symbol: str) -> str | None:
    return _loaded_versions.get(symbol) or get_latest_version(symbol)


def resolve_artifact(symbol: str) -> ArtifactRef:
    version = get_latest_version(symbol)
    if version and _artifact_exists(symbol, version):
        return build_versioned_artifact_ref(symbol, version)

    generic_model = _generic_model_path(symbol)
    generic_scaler = _generic_scaler_path(symbol)
    if os.path.exists(generic_model) and os.path.exists(generic_scaler):
        return ArtifactRef(
            symbol=symbol,
            version=None,
            model_path=generic_model,
            scaler_path=generic_scaler,
        )

    raise FileNotFoundError(f"No matching model/scaler pair found for {symbol}")


def _load_keras_model(path: str):
    import tensorflow as tf
    from tensorflow.keras.models import load_model

    class _PatchedDense(tf.keras.layers.Dense):
        def __init__(self, *args, **kwargs):
            kwargs.pop("quantization_config", None)
            super().__init__(*args, **kwargs)

    return load_model(
        path,
        custom_objects={"Dense": _PatchedDense},
        compile=False,
    )


def invalidate_symbol_cache(symbol: str | None = None) -> None:
    if symbol is None:
        _models.clear()
        _scalers.clear()
        _loaded_versions.clear()
        return

    _models.pop(symbol, None)
    _scalers.pop(symbol, None)
    _loaded_versions.pop(symbol, None)


def _ensure_loaded(symbol: str) -> ArtifactRef:
    artifact = resolve_artifact(symbol)
    cached_version = _loaded_versions.get(symbol)

    if (
        symbol in _models
        and symbol in _scalers
        and cached_version == artifact.version
    ):
        return artifact

    invalidate_symbol_cache(symbol)

    if not os.path.exists(artifact.model_path):
        raise FileNotFoundError(f"No model found for {symbol} at {artifact.model_path}")
    if not os.path.exists(artifact.scaler_path):
        raise FileNotFoundError(f"No scaler found for {symbol} at {artifact.scaler_path}")

    print(f"[Loader] Loading model: {os.path.basename(artifact.model_path)}")
    print(f"[Loader] Loading scaler: {os.path.basename(artifact.scaler_path)}")
    _models[symbol] = _load_keras_model(artifact.model_path)
    _scalers[symbol] = joblib.load(artifact.scaler_path)
    _loaded_versions[symbol] = artifact.version
    return artifact


def get_model(symbol: str = "XAU/USD"):
    _ensure_loaded(symbol)
    return _models[symbol]


def get_scaler(symbol: str = "XAU/USD"):
    _ensure_loaded(symbol)
    return _scalers[symbol]


def is_model_ready(symbol: str = "XAU/USD") -> bool:
    try:
        resolve_artifact(symbol)
        return True
    except FileNotFoundError:
        return False
