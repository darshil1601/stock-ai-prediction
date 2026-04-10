export type Category = "Stock" | "Commodity" | "Crypto" | "Forex";

export interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  category: Category;
  sparkline?: number[];
}

export type Stock = Asset;

export interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PredictionData {
  date: string;
  actual: number | null;
  predicted: number | null;
  lowerBound: number | null;
  upperBound: number | null;
}

export interface ForecastMeta {
  raw_return_pct: number;
  baseline_return_pct: number;
  adjusted_return_pct: number;
  volatility_cap_pct: number;
  signal_threshold_pct: number;
  confidence_band_pct: number;
  trades_weekends: boolean;
  asset_class: "commodity" | "crypto" | "forex" | "macro" | string;
}

export type Timeframe =
  | "1m" | "5m" | "15m" | "30m" | "1h" | "4h"
  | "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y";

export interface EntryExitZones {
  signal: string;
  signalZone: [number, number];
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: number;
}

export interface RiskMetrics {
  volatility: number;
  aiConfidence: number;
  riskLevel: "Low" | "Medium" | "High";
  market_alert?: "normal" | "caution" | "warning" | "danger";
  event_detected?: boolean;
  /** FinBERT aggregate from news (-1 … +1) */
  sentiment_score?: number;
  sentiment_label?: string;
  max_event?: number;
  event_tier?: "LOW" | "MEDIUM" | "HIGH";
  news_count?: number;
}

export interface MarketIntelligence {
  market_alert: "normal" | "caution" | "warning" | "danger";
  event_detected: boolean;
  spike_ratio: number;
  warnings: string[];
  current_move_pct: number;
  avg_move_pct: number;
  sentiment_applied?: boolean;
  sentiment_score?: number;
  sentiment_label?: string;
  max_event?: number;
  news_count?: number;
  event_tier?: "LOW" | "MEDIUM" | "HIGH";
}
