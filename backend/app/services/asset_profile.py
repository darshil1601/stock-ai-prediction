from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class AssetProfile:
    symbol: str
    asset_class: str
    trades_weekends: bool
    min_signal_return: float
    signal_volatility_fraction: float
    model_weight: float
    short_window: int
    medium_window: int
    volatility_cap_multiplier: float
    min_return_cap: float
    max_return_cap: float
    confidence_band_multiplier: float


DEFAULT_PROFILE = AssetProfile(
    symbol="DEFAULT",
    asset_class="macro",
    trades_weekends=False,
    min_signal_return=0.002,
    signal_volatility_fraction=0.15,
    model_weight=0.85,  # Increased to trust LSTM more
    short_window=5,
    medium_window=20,
    volatility_cap_multiplier=1.5,
    min_return_cap=0.003,
    max_return_cap=0.035,
    confidence_band_multiplier=1.1,
)


ASSET_PROFILES: dict[str, AssetProfile] = {
    "XAU/USD": AssetProfile(
        symbol="XAU/USD",
        asset_class="commodity",
        trades_weekends=False,
        min_signal_return=0.0025,
        signal_volatility_fraction=0.15,
        model_weight=0.85, # Let model dictate sharp moves
        short_window=5,
        medium_window=20,
        volatility_cap_multiplier=1.40,
        min_return_cap=0.0030,
        max_return_cap=0.0250, # Room for realistic gold spikes
        confidence_band_multiplier=1.15,
    ),
    "EUR/USD": AssetProfile(
        symbol="EUR/USD",
        asset_class="forex",
        trades_weekends=False,
        min_signal_return=0.0010,
        signal_volatility_fraction=0.15,
        model_weight=0.88,
        short_window=5,
        medium_window=20,
        volatility_cap_multiplier=1.20,
        min_return_cap=0.0015,
        max_return_cap=0.015,
        confidence_band_multiplier=1.00,
    ),
    "BTC/USD": AssetProfile(
        symbol="BTC/USD",
        asset_class="crypto",
        trades_weekends=True,
        min_signal_return=0.0080,
        signal_volatility_fraction=0.20,
        model_weight=0.82,               # Trust the model's momentum more than moving averages
        short_window=7,
        medium_window=30,
        volatility_cap_multiplier=1.75,  # Higher volatility cap for real crypto spikes
        min_return_cap=0.0120,
        max_return_cap=0.0850,           # Allow up to 8.5% daily move if predicted
        confidence_band_multiplier=1.45,
    ),
}


def get_asset_profile(symbol: str) -> AssetProfile:
    return ASSET_PROFILES.get(symbol, DEFAULT_PROFILE)


def next_trading_day(symbol: str, current_date: date) -> date:
    profile = get_asset_profile(symbol)
    next_date = current_date + timedelta(days=1)

    if profile.trades_weekends:
        return next_date

    while next_date.weekday() >= 5:
        next_date += timedelta(days=1)

    return next_date
