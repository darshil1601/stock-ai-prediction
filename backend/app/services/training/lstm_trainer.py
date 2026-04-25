# ==========================================
# IMPORTS
# ==========================================
from __future__ import annotations

import math
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.layers import BatchNormalization, Dense, Dropout, LSTM
from tensorflow.keras.models import Sequential
from tensorflow.keras.optimizers import Adam

from app.services.dataset_builder import DatasetBundle, build_lstm_dataset
from app.services.feature_engineering import add_features
from app.services.model_loader import (
    build_versioned_artifact_ref,
    get_model_path,
    get_models_dir,
    get_scaler_path,
    invalidate_symbol_cache,
)
from app.services.twelve_fetcher import fetch_historical_data


FEATURES = [
    "close", "returns",
    "sma_20", "ema_9", "ema_21",
    "macd", "macd_signal", "macd_hist",
    "volatility_20", "rsi_14",
    "bb_upper", "bb_lower", "bb_width", "bb_pct",
    "atr_pct",
    "roc_5", "roc_10",
    "lag_1", "lag_2", "lag_3", "lag_4", "lag_5",
]


def _inverse_return_values(bundle: DatasetBundle, values: np.ndarray) -> np.ndarray:
    target_column_index = FEATURES.index("returns")
    dummy = np.zeros((len(values), len(FEATURES)))
    dummy[:, target_column_index] = values.reshape(-1)
    inversed = bundle.scaler.inverse_transform(dummy)
    return inversed[:, target_column_index]


def _validate_artifact_files(model_path: str, scaler_path: str) -> None:
    from app.services.model_loader import _load_keras_model

    _load_keras_model(model_path)
    joblib.load(scaler_path)


def _cleanup_old_artifacts(symbol: str, keep: int = 3) -> None:
    """
    Delete old versioned model/scaler files, keeping only the `keep` newest ones.
    Generic (non-versioned) files like btcusd_lstm_model.h5 are never deleted.
    """
    import glob
    slug = symbol.replace("/", "").lower()
    models_dir = get_models_dir()

    # Find all versioned model files for this symbol
    versioned_models = sorted(
        glob.glob(os.path.join(models_dir, f"{slug}_model_v*.h5"))
    )  # sorted by name = sorted by timestamp (since version is datetime)

    versioned_scalers = sorted(
        glob.glob(os.path.join(models_dir, f"{slug}_scaler_v*.pkl"))
    )

    # Delete oldest ones, keep only latest `keep`
    for old_model in versioned_models[:-keep]:
        try:
            os.remove(old_model)
            print(f"[Cleanup] Deleted old model: {os.path.basename(old_model)}")
        except Exception as e:
            print(f"[Cleanup] Warning: Could not delete {old_model}: {e}")

    for old_scaler in versioned_scalers[:-keep]:
        try:
            os.remove(old_scaler)
            print(f"[Cleanup] Deleted old scaler: {os.path.basename(old_scaler)}")
        except Exception as e:
            print(f"[Cleanup] Warning: Could not delete {old_scaler}: {e}")

    remaining = max(0, len(versioned_models) - keep)
    if remaining > 0:
        print(f"[Cleanup] Removed {remaining} old version(s) for {symbol}. Keeping latest {keep}.")
    else:
        print(f"[Cleanup] No old versions to remove for {symbol}.")


def _save_artifacts_atomic(symbol: str, version: str, model, bundle: DatasetBundle) -> tuple[str, str]:
    slug = symbol.replace("/", "").lower()
    models_dir = get_models_dir()
    os.makedirs(models_dir, exist_ok=True)

    versioned = build_versioned_artifact_ref(symbol, version)
    generic_model_path = get_model_path(symbol)
    generic_scaler_path = get_scaler_path(symbol)

    temp_dir = tempfile.mkdtemp(prefix=f"{slug}_{version}_", dir=models_dir)
    tmp_model_path = os.path.join(temp_dir, os.path.basename(versioned.model_path))
    tmp_scaler_path = os.path.join(temp_dir, os.path.basename(versioned.scaler_path))
    tmp_generic_model = os.path.join(temp_dir, os.path.basename(generic_model_path))
    tmp_generic_scaler = os.path.join(temp_dir, os.path.basename(generic_scaler_path))

    try:
        model.save(tmp_model_path)
        joblib.dump(bundle.scaler, tmp_scaler_path)
        _validate_artifact_files(tmp_model_path, tmp_scaler_path)

        os.replace(tmp_model_path, versioned.model_path)
        os.replace(tmp_scaler_path, versioned.scaler_path)

        shutil.copy2(versioned.model_path, tmp_generic_model)
        shutil.copy2(versioned.scaler_path, tmp_generic_scaler)
        os.replace(tmp_generic_model, generic_model_path)
        os.replace(tmp_generic_scaler, generic_scaler_path)
    except Exception:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise

    shutil.rmtree(temp_dir, ignore_errors=True)
    invalidate_symbol_cache(symbol)
    return versioned.model_path, versioned.scaler_path


def train(symbol: str = "XAU/USD") -> None:
    """
    Full LSTM training pipeline with leakage-safe scaling and atomic artifact writes.
    """
    slug = symbol.replace("/", "").lower()

    print(f"\n{'=' * 60}")
    print(f"  Training LSTM for {symbol}")
    print(f"{'=' * 60}")
    print("Fetching prediction history from Twelve Data...")
    df = fetch_historical_data(symbol, outputsize=5000)
    print(f"Raw rows fetched: {len(df)}")

    print("Applying feature engineering...")
    df = add_features(df)
    df.dropna(inplace=True)
    print(f"Clean rows after feature engineering: {len(df)}")

    if len(df) < 200:
        raise RuntimeError(f"Not enough data to train ({len(df)} rows). Need 200+.")

    print("Building leakage-safe train/test dataset...")
    bundle = build_lstm_dataset(df, FEATURES, window_size=60, symbol=symbol)
    X_train, y_train = bundle.X_train, bundle.y_train
    X_test, y_test = bundle.X_test, bundle.y_test

    print(f"Train: {X_train.shape}  |  Val: {X_test.shape}")

    n_features = len(FEATURES)
    model = Sequential([
        LSTM(units=128, return_sequences=True, input_shape=(60, n_features)),
        BatchNormalization(),
        Dropout(0.3),
        LSTM(units=64, return_sequences=True),
        BatchNormalization(),
        Dropout(0.2),
        LSTM(units=32, return_sequences=False),
        Dropout(0.2),
        Dense(16, activation="relu"),
        Dense(1),
    ])

    opt = Adam(learning_rate=0.001, clipnorm=1.0)
    model.compile(optimizer=opt, loss="huber")

    callbacks = [
        EarlyStopping(
            monitor="val_loss",
            patience=10,
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1,
        ),
    ]

    print("Training (max 100 epochs)...")
    history = model.fit(
        X_train,
        y_train,
        validation_data=(X_test, y_test),
        epochs=100,
        batch_size=16,
        callbacks=callbacks,
        verbose=1,
    )

    best_epoch = int(np.argmin(history.history["val_loss"])) + 1
    best_val_loss = float(min(history.history["val_loss"]))
    print(f"\nBest epoch: {best_epoch} | Best val_loss: {best_val_loss:.6f}")

    print("Evaluating on validation set...")
    predictions = model.predict(X_test, verbose=0).reshape(-1)
    pred_returns = _inverse_return_values(bundle, predictions)
    actual_returns = _inverse_return_values(bundle, y_test.reshape(-1))

    rmse = math.sqrt(mean_squared_error(actual_returns, pred_returns))
    mae = mean_absolute_error(actual_returns, pred_returns)
    direction_accuracy = float(
        np.mean(np.sign(pred_returns) == np.sign(actual_returns))
    ) if len(actual_returns) else 0.0

    print(f"RMSE : {rmse:.6f}")
    print(f"MAE  : {mae:.6f}")
    print(f"DIR  : {direction_accuracy * 100:.2f}%")

    version = f"v{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    model_path, scaler_path = _save_artifacts_atomic(symbol, version, model, bundle)

    print(f"Model saved -> {model_path}")
    print(f"Scaler saved -> {scaler_path}")

    # Auto-cleanup: keep only the 3 latest versioned models per symbol
    _cleanup_old_artifacts(symbol, keep=3)

    try:
        from app.database import save_market_prices, save_model_info

        cols = ["date", "open", "high", "low", "close", "volume"]
        market_records = df[cols].tail(1000).copy()
        market_records["date"] = market_records["date"].astype(str)
        market_records = market_records.to_dict(orient="records")
        for record in market_records:
            record["symbol"] = symbol

        for i in range(0, len(market_records), 500):
            batch = market_records[i:i + 500]
            save_market_prices(symbol, batch)

        save_model_info({
            "symbol": symbol,
            "model_name": f"{slug.upper()}_LSTM",
            "version": version,
            "accuracy": round(direction_accuracy * 100, 2),
            "last_trained_at": datetime.now(timezone.utc).isoformat(),
            "training_rows": len(df),
            "metrics": {
                "rmse": round(rmse, 6),
                "mae": round(mae, 6),
                "directional_accuracy": round(direction_accuracy, 6),
                "val_loss": round(best_val_loss, 6),
                "epochs": best_epoch,
            },
        })
        print(f"[Supabase] Model {version} metrics logged successfully for {symbol}.")
    except Exception as exc:
        print(f"CRITICAL: Database logging failed for {symbol}: {exc}")
        print("Please ensure Supabase tables are created and Unique constraints are set for (symbol, date).")

    print(f"\n[SUCCESS] Training complete for {symbol}")
    print("=" * 60)


if __name__ == "__main__":
    symbol = sys.argv[1] if len(sys.argv) > 1 else "XAU/USD"
    train(symbol)
