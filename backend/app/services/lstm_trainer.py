# ==========================================
# IMPORTS
# ==========================================
import os
import sys
import numpy as np
import math
from sklearn.metrics import mean_squared_error, mean_absolute_error
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras.optimizers import Adam

from app.services.twelve_fetcher import fetch_historical_data
from app.services.feature_engineering import add_features
from app.services.dataset_builder import build_lstm_dataset


# ─── Feature list (must match prediction_service.py FEATURES) ─────────────────
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


def train(symbol: str = "XAU/USD") -> None:
    """
    Full LSTM training pipeline v2 — upgraded architecture + features.
    Run:  python -m app.services.lstm_trainer XAU/USD
    """
    slug = symbol.replace("/", "").lower()

    # ==========================================
    # 1️⃣ Fetch maximum available history
    # ==========================================
    print(f"\n{'='*60}")
    print(f"  Training LSTM v2 for {symbol}")
    print(f"{'='*60}")
    print(f"Fetching maximum history from Twelve Data...")
    df = fetch_historical_data(symbol, outputsize=5000)
    print(f"Raw rows fetched: {len(df)}")

    # ==========================================
    # 2️⃣ Feature Engineering (v2 — 22 features)
    # ==========================================
    print("Applying feature engineering v2 (22 features)...")
    df = add_features(df)
    df.dropna(inplace=True)
    print(f"Clean rows after feature engineering: {len(df)}")

    if len(df) < 200:
        raise RuntimeError(f"Not enough data to train ({len(df)} rows). Need 200+.")

    # ==========================================
    # 3️⃣ Build Dataset (window=60)
    # ==========================================
    print("Building LSTM dataset...")
    X, y = build_lstm_dataset(df, FEATURES, window_size=60, symbol=symbol)

    print(f"X shape: {X.shape}")
    print(f"y shape: {y.shape}")

    # ==========================================
    # 4️⃣ Train / Validation Split (80/20, no shuffle)
    # ==========================================
    split = int(len(X) * 0.8)
    X_train, X_test  = X[:split], X[split:]
    y_train, y_test  = y[:split], y[split:]

    print(f"Train: {X_train.shape}  |  Val: {X_test.shape}")

    # ==========================================
    # 5️⃣ Build Upgraded LSTM Model (3-layer + BN)
    # ==========================================
    print(f"Building LSTM v2 model ({len(FEATURES)} features)...")

    n_features = len(FEATURES)
    model = Sequential([
        # Layer 1: Deep sequence learning
        LSTM(units=128, return_sequences=True, input_shape=(60, n_features)),
        BatchNormalization(),
        Dropout(0.3),

        # Layer 2: Mid-level patterns
        LSTM(units=64, return_sequences=True),
        BatchNormalization(),
        Dropout(0.2),

        # Layer 3: Signal compression
        LSTM(units=32, return_sequences=False),
        Dropout(0.2),

        # Dense head
        Dense(16, activation="relu"),
        Dense(1),   # → next-day return prediction
    ])

    # Adam with gradient clipping — prevents exploding gradients on BTC
    opt = Adam(learning_rate=0.001, clipnorm=1.0)
    model.compile(optimizer=opt, loss="huber")  # Huber more robust than MSE on outliers
    model.summary()

    # ==========================================
    # 6️⃣ Callbacks
    # ==========================================
    callbacks = [
        EarlyStopping(
            monitor="val_loss",
            patience=10,          # was 5 — give model time to learn
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,           # halve LR on plateau
            patience=5,
            min_lr=1e-6,
            verbose=1,
        ),
    ]

    # ==========================================
    # 7️⃣ Train
    # ==========================================
    print(f"Training (max 100 epochs, early stop patience=10)...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=100,       # EarlyStopping will stop before this if converged
        batch_size=16,    # Small batch = better generalisation
        callbacks=callbacks,
        verbose=1,
    )

    best_epoch = len(history.history["loss"])
    best_val_loss = min(history.history["val_loss"])
    print(f"\nBest epoch: {best_epoch} | Best val_loss: {best_val_loss:.6f}")

    # ==========================================
    # 8️⃣ Evaluate
    # ==========================================
    print("Evaluating on test set...")
    predictions = model.predict(X_test, verbose=0)

    rmse = math.sqrt(mean_squared_error(y_test, predictions))
    mae  = mean_absolute_error(y_test, predictions)

    print(f"RMSE : {rmse:.6f}")
    print(f"MAE  : {mae:.6f}")

    # ==========================================
    # 9️⃣ Save Model + Scaler
    # ==========================================
    os.makedirs("app/models", exist_ok=True)
    model_path = f"app/models/{slug}_lstm_model.h5"
    model.save(model_path)
    print(f"Model saved → {model_path}")

    if symbol == "XAU/USD":
        model.save("app/models/lstm_model.h5")
        print("Legacy model saved → app/models/lstm_model.h5")

    # ==========================================
    # 🔟 Log to Database (New)
    # ==========================================
    try:
        from app.database import save_market_prices, save_model_info
        from datetime import datetime
        
        # 1. Save historical data used (sync with market_data table)
        # Limit to last 5000 rows to keep DB clean but useful
        market_records = df.tail(5000).to_dict(orient="records")
        for r in market_records:
            r["symbol"] = symbol # Ensure symbol is present for the new schema
        
        # Split into batches of 500 to avoid Supabase limits
        for i in range(0, len(market_records), 500):
            batch = market_records[i : i + 500]
            save_market_prices(symbol, batch)
        
        # 2. Save Model Performance
        save_model_info({
            "model_name": f"{slug.upper()}_LSTM",
            "version": "2.0.0",
            "accuracy": round(max(0, 100 * (1 - mae)), 2), # Approximated accuracy
            "trained_on": datetime.now().strftime("%Y-%m-%d"),
            "training_rows": len(df),
            "metrics": {
                "rmse": round(rmse, 6),
                "mae": round(mae, 6),
                "val_loss": round(best_val_loss, 6),
                "epochs": best_epoch
            }
        })
        print(f"✅ Data & Model metrics logged to Supabase.")
        
    except Exception as e:
        print(f"⚠️  Database logging failed: {e}")

    print(f"\n[SUCCESS] Training complete for {symbol}")
    print(f"   RMSE={rmse:.6f}  MAE={mae:.6f}")
    print("="*60)


# ── Guard ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    from datetime import datetime
    symbol = sys.argv[1] if len(sys.argv) > 1 else "XAU/USD"
    train(symbol)