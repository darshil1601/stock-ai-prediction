from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone


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
    history_interval: str
    prediction_label: str
    target_step: timedelta
    market_close_hour_utc: int | None = None
    market_close_minute_utc: int | None = None
    candle_confirmation_buffer_minutes: int = 0


DEFAULT_PROFILE = AssetProfile(
    symbol="DEFAULT",
    asset_class="macro",
    trades_weekends=False,
    min_signal_return=0.002,
    signal_volatility_fraction=0.15,
    model_weight=0.85,
    short_window=5,
    medium_window=20,
    volatility_cap_multiplier=1.5,
    min_return_cap=0.003,
    max_return_cap=0.035,
    confidence_band_multiplier=1.1,
    history_interval="1day",
    prediction_label="Predicted Next Close",
    target_step=timedelta(days=1),
    market_close_hour_utc=22,
    market_close_minute_utc=0,
    candle_confirmation_buffer_minutes=30,
)


ASSET_PROFILES: dict[str, AssetProfile] = {
    "XAU/USD": AssetProfile(
        symbol="XAU/USD",
        asset_class="commodity",
        trades_weekends=False,
        min_signal_return=0.0025,
        signal_volatility_fraction=0.15,
        model_weight=0.85,
        short_window=5,
        medium_window=20,
        volatility_cap_multiplier=1.40,
        min_return_cap=0.0030,
        max_return_cap=0.0250,
        confidence_band_multiplier=1.15,
        history_interval="1day",
        prediction_label="Predicted Next Close",
        target_step=timedelta(days=1),
        market_close_hour_utc=22,
        market_close_minute_utc=0,
        candle_confirmation_buffer_minutes=30,
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
        history_interval="1day",
        prediction_label="Predicted Next Close",
        target_step=timedelta(days=1),
        market_close_hour_utc=22,
        market_close_minute_utc=0,
        candle_confirmation_buffer_minutes=30,
    ),
    "BTC/USD": AssetProfile(
        symbol="BTC/USD",
        asset_class="crypto",
        trades_weekends=True,
        min_signal_return=0.0025,
        signal_volatility_fraction=0.18,
        model_weight=0.80,
        short_window=12,
        medium_window=72,
        volatility_cap_multiplier=1.50,
        min_return_cap=0.0030,
        max_return_cap=0.0300,
        confidence_band_multiplier=1.25,
        history_interval="1h",
        prediction_label="Predicted Next 1H Close",
        target_step=timedelta(hours=1),
    ),
}


def get_asset_profile(symbol: str) -> AssetProfile:
    return ASSET_PROFILES.get(symbol, DEFAULT_PROFILE)


def parse_candle_timestamp(raw_value: str | datetime | date) -> datetime:
    if isinstance(raw_value, datetime):
        return raw_value if raw_value.tzinfo else raw_value.replace(tzinfo=timezone.utc)
    if isinstance(raw_value, date):
        return datetime.combine(raw_value, time(0, 0), tzinfo=timezone.utc)

    text = str(raw_value).strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d"):
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    raise ValueError(f"Unsupported candle timestamp: {raw_value}")


def serialize_candle_timestamp(symbol: str, ts: datetime) -> str:
    profile = get_asset_profile(symbol)
    if profile.history_interval == "1day":
        return ts.astimezone(timezone.utc).strftime("%Y-%m-%d")
    return ts.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def next_trading_day(symbol: str, current_date: date) -> date:
    profile = get_asset_profile(symbol)
    next_date = current_date + timedelta(days=1)

    if profile.trades_weekends:
        return next_date

    while next_date.weekday() >= 5:
        next_date += timedelta(days=1)

    return next_date


def next_prediction_timestamp(symbol: str, current_timestamp: datetime) -> datetime:
    profile = get_asset_profile(symbol)
    current_utc = current_timestamp.astimezone(timezone.utc)

    if profile.history_interval == "1day":
        next_day = next_trading_day(symbol, current_utc.date())
        close_hour = profile.market_close_hour_utc or 22
        close_minute = profile.market_close_minute_utc or 0
        return datetime.combine(
            next_day,
            time(close_hour, close_minute, tzinfo=timezone.utc),
        )

    return current_utc + profile.target_step


def is_partial_candle(
    symbol: str,
    last_timestamp: datetime,
    now_utc: datetime | None = None,
) -> bool:
    profile = get_asset_profile(symbol)
    current_utc = now_utc or datetime.now(timezone.utc)
    candle_utc = last_timestamp.astimezone(timezone.utc)

    if profile.history_interval == "1day":
        if candle_utc.date() != current_utc.date():
            return False
        close_hour = profile.market_close_hour_utc or 22
        close_minute = profile.market_close_minute_utc or 0
        cutoff = datetime.combine(
            current_utc.date(),
            time(close_hour, close_minute, tzinfo=timezone.utc),
        ) + timedelta(minutes=profile.candle_confirmation_buffer_minutes)
        return current_utc < cutoff

    return current_utc < (candle_utc + profile.target_step)


def format_prediction_target(symbol: str, target_timestamp: datetime) -> str:
    profile = get_asset_profile(symbol)
    target_utc = target_timestamp.astimezone(timezone.utc)
    if profile.history_interval == "1day":
        return target_utc.strftime("%Y-%m-%d %H:%M UTC")
    return target_utc.strftime("%Y-%m-%d %H:%M UTC")
