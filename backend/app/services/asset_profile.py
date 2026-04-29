from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone


BTC_4H_CUTOVER_DATE = date(2026, 4, 26)


# ── Market Holiday Calendar (NYSE/COMEX/Forex) 2025-2027 ─────────────────────
# XAU/USD and EUR/USD follow these closures. BTC trades 24/7 (no holidays).
MARKET_HOLIDAYS: frozenset[date] = frozenset([
    # 2025
    date(2025, 1, 1),   # New Year's Day
    date(2025, 1, 20),  # MLK Day
    date(2025, 2, 17),  # Presidents' Day
    date(2025, 4, 18),  # Good Friday
    date(2025, 5, 26),  # Memorial Day
    date(2025, 7, 4),   # Independence Day
    date(2025, 9, 1),   # Labor Day
    date(2025, 11, 27), # Thanksgiving
    date(2025, 12, 25), # Christmas
    # 2026
    date(2026, 1, 1),   # New Year's Day
    date(2026, 1, 19),  # MLK Day
    date(2026, 2, 16),  # Presidents' Day
    date(2026, 4, 3),   # Good Friday
    date(2026, 4, 6),   # Easter Monday (Forex/Gold closes)
    date(2026, 5, 25),  # Memorial Day
    date(2026, 7, 3),   # Independence Day (observed, Jul 4 = Saturday)
    date(2026, 9, 7),   # Labor Day
    date(2026, 11, 26), # Thanksgiving
    date(2026, 12, 25), # Christmas
    # 2027
    date(2027, 1, 1),   # New Year's Day
    date(2027, 1, 18),  # MLK Day
    date(2027, 2, 15),  # Presidents' Day
    date(2027, 3, 26),  # Good Friday
    date(2027, 5, 31),  # Memorial Day
    date(2027, 7, 5),   # Independence Day (observed)
    date(2027, 9, 6),   # Labor Day
    date(2027, 11, 25), # Thanksgiving
    date(2027, 12, 24), # Christmas (observed, Dec 25 = Saturday)
])


def is_market_holiday(d: date, symbol: str) -> bool:
    """Returns True if the given date is a market holiday for this symbol."""
    # BTC trades 24/7 — no holidays
    if "BTC" in symbol.upper():
        return False
    return d in MARKET_HOLIDAYS


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
        min_signal_return=0.0008,      # Lowered: was 0.0025 — too high, caused always HOLD
        signal_volatility_fraction=0.08,  # Lowered: was 0.15 — threshold was always > LSTM return
        model_weight=0.88,             # Increased: was 0.85 — give model more weight
        short_window=5,
        medium_window=20,
        volatility_cap_multiplier=1.40,
        min_return_cap=0.0010,         # Lowered: was 0.0030
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
        min_signal_return=0.0003,      # Lowered: was 0.0010 — forex moves are tiny
        signal_volatility_fraction=0.08,  # Lowered: was 0.15
        model_weight=0.90,             # Increased: was 0.88
        short_window=5,
        medium_window=20,
        volatility_cap_multiplier=1.20,
        min_return_cap=0.0005,         # Lowered: was 0.0015
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
        min_signal_return=0.0015,      # Slightly higher for 4h moves
        signal_volatility_fraction=0.10,
        model_weight=0.82,
        short_window=12,
        medium_window=72,
        volatility_cap_multiplier=1.50,
        min_return_cap=0.0020,
        max_return_cap=0.0400,         # 4h can move more than 1h
        confidence_band_multiplier=1.25,
        history_interval="4h",         # Changed from 1h → 4h
        prediction_label="Predicted Next 4H Close",
        target_step=timedelta(hours=4),  # Changed from 1h → 4h
    ),
}


def get_asset_profile(symbol: str) -> AssetProfile:
    return ASSET_PROFILES.get(symbol, DEFAULT_PROFILE)


def _coerce_reference_date(reference: str | datetime | date | None) -> date | None:
    if reference is None:
        return None
    if isinstance(reference, datetime):
        return reference.astimezone(timezone.utc).date()
    if isinstance(reference, date):
        return reference

    text = str(reference).strip()
    if not text:
        return None

    maybe_date = text[:10]
    try:
        return datetime.strptime(maybe_date, "%Y-%m-%d").date()
    except ValueError:
        pass

    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(text)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).date()
    except ValueError:
        return None


def get_market_close_time_utc(symbol: str, target_date: date) -> time:
    """Dynamically determine market close time in UTC, accounting for US DST (New York 17:00)."""
    profile = get_asset_profile(symbol)
    
    if profile.asset_class == "crypto":
        # Crypto always closes at exactly Midnight UTC, regardless of seasons
        return time(0, 0, tzinfo=timezone.utc)
        
    if profile.asset_class in ("forex", "commodity"):
        try:
            import zoneinfo
            ny_tz = zoneinfo.ZoneInfo("America/New_York")
            dt_ny = datetime.combine(target_date, time(17, 0)).replace(tzinfo=ny_tz)
            return dt_ny.astimezone(timezone.utc).timetz()
        except Exception:
            pass  # Fallback to static if zoneinfo not available
            
    close_hour = profile.market_close_hour_utc if profile.market_close_hour_utc is not None else 22
    close_minute = profile.market_close_minute_utc if profile.market_close_minute_utc is not None else 0
    return time(close_hour, close_minute, tzinfo=timezone.utc)


def resolve_history_interval(
    symbol: str,
    reference: str | datetime | date | None = None,
) -> str:
    profile = get_asset_profile(symbol)
    if profile.history_interval == "1day":
        return "1day"

    # BTC 4H rollout starts only from the configured cutover date.
    if symbol == "BTC/USD":
        ref_date = _coerce_reference_date(reference) or datetime.now(timezone.utc).date()
        return "4h" if ref_date >= BTC_4H_CUTOVER_DATE else "1day"

    return profile.history_interval


def resolve_target_step(
    symbol: str,
    reference: str | datetime | date | None = None,
) -> timedelta:
    interval = resolve_history_interval(symbol, reference)
    if interval == "1day":
        return timedelta(days=1)
    return get_asset_profile(symbol).target_step


def resolve_prediction_label(
    symbol: str,
    reference: str | datetime | date | None = None,
) -> str:
    interval = resolve_history_interval(symbol, reference)
    if interval == "1day":
        return "Predicted Next Close"
    return get_asset_profile(symbol).prediction_label


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
    interval = resolve_history_interval(symbol, ts)
    if interval == "1day":
        return ts.astimezone(timezone.utc).strftime("%Y-%m-%d")
    return ts.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def next_trading_day(symbol: str, current_date: date) -> date:
    profile = get_asset_profile(symbol)
    next_date = current_date + timedelta(days=1)

    # BTC trades 24/7 — skip all checks
    if profile.trades_weekends:
        return next_date

    # Skip weekends AND market holidays
    while next_date.weekday() >= 5 or next_date in MARKET_HOLIDAYS:
        next_date += timedelta(days=1)

    return next_date


def next_prediction_timestamp(symbol: str, current_timestamp: datetime) -> datetime:
    profile = get_asset_profile(symbol)
    current_utc = current_timestamp.astimezone(timezone.utc)
    interval = resolve_history_interval(symbol, current_utc)

    if interval == "1day":
        next_day = next_trading_day(symbol, current_utc.date())
        close_time = get_market_close_time_utc(symbol, next_day)
        return datetime.combine(next_day, close_time)

    return current_utc + resolve_target_step(symbol, current_utc)


def is_partial_candle(
    symbol: str,
    last_timestamp: datetime,
    now_utc: datetime | None = None,
) -> bool:
    profile = get_asset_profile(symbol)
    current_utc = now_utc or datetime.now(timezone.utc)
    candle_utc = last_timestamp.astimezone(timezone.utc)
    interval = resolve_history_interval(symbol, current_utc)

    if interval == "1day":
        close_time = get_market_close_time_utc(symbol, candle_utc.date())
        expected_close = datetime.combine(candle_utc.date(), close_time)
        cutoff = expected_close + timedelta(minutes=profile.candle_confirmation_buffer_minutes)
        return current_utc < cutoff

    return current_utc < (candle_utc + resolve_target_step(symbol, current_utc))


def format_prediction_target(symbol: str, target_timestamp: datetime) -> str:
    target_utc = target_timestamp.astimezone(timezone.utc)
    interval = resolve_history_interval(symbol, target_utc)
    if interval == "1day":
        return target_utc.strftime("%d %b %y")
    return target_utc.strftime("%d %b %y %H:%M UTC")
