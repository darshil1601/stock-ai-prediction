import numpy as np
from sklearn.preprocessing import StandardScaler
import joblib
import os


# ==========================================
# Build LSTM Dataset
# ==========================================
def build_lstm_dataset(df, feature_columns, window_size=60, symbol="XAU/USD"):

    # Use selected features
    data = df[feature_columns].values

    # Scale features using StandardScaler for better cross-asset normalization
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(data)

    # Save scaler (for prediction time)
    slug = symbol.replace("/", "").lower()
    scaler_path = f"app/models/{slug}_scaler.pkl"
    joblib.dump(scaler, scaler_path)
    
    # Also save as legacy for gold compatibility
    if symbol == "XAU/USD":
        joblib.dump(scaler, "app/models/scaler.pkl")

    X, y = [], []

    # We predict NEXT DAY RETURN
    target_column_index = feature_columns.index("returns")

    for i in range(window_size, len(scaled_data)):
        X.append(scaled_data[i-window_size:i])
        y.append(scaled_data[i, target_column_index])

    X = np.array(X)
    y = np.array(y)

    return X, y