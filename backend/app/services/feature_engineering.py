import pandas as pd
import numpy as np


# ==========================================
# Calculate RSI
# ==========================================
def calculate_rsi(series, window=14):
    delta = series.diff()

    gain = delta.clip(lower=0)
    loss = -1 * delta.clip(upper=0)

    avg_gain = gain.ewm(com=window - 1, min_periods=window).mean()
    avg_loss = loss.ewm(com=window - 1, min_periods=window).mean()

    rs  = avg_gain / avg_loss.replace(0, 1e-9)
    rsi = 100 - (100 / (1 + rs))

    return rsi


# ==========================================
# Calculate ATR (Average True Range)
# ==========================================
def calculate_atr(df: pd.DataFrame, window: int = 14) -> pd.Series:
    """True Range = max(H-L, |H-prevC|, |L-prevC|). Falls back to volatility if OHLC missing."""
    if "high" in df.columns and "low" in df.columns:
        high = df["high"].astype(float)
        low  = df["low"].astype(float)
        prev_close = df["close"].shift(1)
        tr = pd.concat([
            high - low,
            (high - prev_close).abs(),
            (low  - prev_close).abs(),
        ], axis=1).max(axis=1)
    else:
        # Fallback: use daily range as a proxy
        tr = df["close"].diff().abs()

    return tr.rolling(window).mean()


# ==========================================
# Main Feature Engineering Function (v2)
# ==========================================
def add_features(df: pd.DataFrame) -> pd.DataFrame:

    df = df.copy()
    df["close"] = df["close"].astype(float)
    close = df["close"]

    # 1️⃣ Daily Returns
    df["returns"] = close.pct_change()

    # 2️⃣ Trend: SMA + EMA
    df["sma_20"] = close.rolling(window=20).mean()
    df["ema_9"]  = close.ewm(span=9, adjust=False).mean()
    df["ema_21"] = close.ewm(span=21, adjust=False).mean()

    # 3️⃣ MACD
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    df["macd"]        = ema12 - ema26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()
    df["macd_hist"]   = df["macd"] - df["macd_signal"]

    # 4️⃣ Volatility
    df["volatility_20"] = df["returns"].rolling(window=20).std()

    # 5️⃣ RSI (improved Wilder EWM)
    df["rsi_14"] = calculate_rsi(close, window=14)

    # 6️⃣ Bollinger Bands
    bb_mid          = close.rolling(20).mean()
    bb_std          = close.rolling(20).std()
    df["bb_upper"]  = bb_mid + 2 * bb_std
    df["bb_lower"]  = bb_mid - 2 * bb_std
    df["bb_width"]  = (df["bb_upper"] - df["bb_lower"]) / bb_mid.replace(0, 1e-9)
    df["bb_pct"]    = (close - df["bb_lower"]) / (df["bb_upper"] - df["bb_lower"]).replace(0, 1e-9)

    # 7️⃣ ATR
    df["atr_14"] = calculate_atr(df, window=14)
    # Normalise ATR as % of price
    df["atr_pct"] = df["atr_14"] / close.replace(0, 1e-9)

    # 8️⃣ Rate of Change
    df["roc_5"]  = close.pct_change(5)
    df["roc_10"] = close.pct_change(10)

    # 9️⃣ Lag Features (returns history)
    for i in range(1, 6):
        df[f"lag_{i}"] = df["returns"].shift(i)

    # Remove NaN rows
    df.dropna(inplace=True)

    return df