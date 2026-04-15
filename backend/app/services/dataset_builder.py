from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.preprocessing import StandardScaler


@dataclass
class DatasetBundle:
    X_train: np.ndarray
    y_train: np.ndarray
    X_test: np.ndarray
    y_test: np.ndarray
    scaler: StandardScaler


_SCALERS: dict[str, StandardScaler] = {}


def build_lstm_dataset(
    df,
    feature_columns,
    window_size: int = 60,
    symbol: str = "XAU/USD",
    train_ratio: float = 0.8,
) -> DatasetBundle:
    """
    Build train/test windows with leakage-safe scaling.
    The scaler is fit only on the raw training slice, then applied to all rows.
    """
    data = df[feature_columns].values
    if len(data) <= window_size + 1:
        raise ValueError("Not enough rows to build LSTM dataset.")

    split_index = int(len(data) * train_ratio)
    split_index = max(window_size + 1, split_index)
    split_index = min(len(data) - 1, split_index)

    scaler = StandardScaler()
    scaler.fit(data[:split_index])
    scaled_data = scaler.transform(data)

    target_column_index = feature_columns.index("returns")
    X, y = [], []
    for i in range(window_size, len(scaled_data)):
        X.append(scaled_data[i - window_size:i])
        y.append(scaled_data[i, target_column_index])

    X = np.asarray(X, dtype=np.float32)
    y = np.asarray(y, dtype=np.float32)

    split_sample_index = split_index - window_size
    split_sample_index = max(1, split_sample_index)
    split_sample_index = min(len(X) - 1, split_sample_index)

    _SCALERS[symbol] = scaler
    return DatasetBundle(
        X_train=X[:split_sample_index],
        y_train=y[:split_sample_index],
        X_test=X[split_sample_index:],
        y_test=y[split_sample_index:],
        scaler=scaler,
    )


def get_scaler_for_symbol(symbol: str) -> StandardScaler:
    scaler = _SCALERS.get(symbol)
    if scaler is None:
        raise KeyError(f"No fitted scaler cached for {symbol}")
    return scaler
