import type {
  EntryExitZones,
  ForecastMeta,
  MarketIntelligence,
  RiskMetrics,
} from "./stock";

export type SupportedPredictionSymbol = "GOLD" | "EURUSD" | "BTC";
export type PredictionSignal = "BUY" | "SELL" | "HOLD";
export type PredictionRiskLevel = "Low" | "Medium" | "High";

export interface PricePoint {
  date: string;
  price: number;
}

export interface PredictionApiPayload {
  symbol: string;
  historical: PricePoint[];
  predicted: PricePoint[];
  next_price: number;
  prediction_value: number;
  prediction_target_time: string;
  prediction_target_label: string;
  prediction_target_display: string;
  current_price_label: string;
  current_price_source: string;
  prediction_data_source: string;
  prediction_status: string;
  signal: PredictionSignal;
  confidence: number;
  accuracy: number | null;
  accuracy_status: string;
  accuracy_note: string;
  model: string;
  model_version: string | null;
  generated_at: string;
  entry_exit_zones: EntryExitZones;
  risk_metrics: RiskMetrics;
  market_intelligence?: MarketIntelligence;
  forecast_meta?: ForecastMeta & {
    history_interval?: string;
  };
}

export interface PredictionTableItem {
  symbol: SupportedPredictionSymbol;
  routeSymbol: SupportedPredictionSymbol;
  name: string;
  market: string;
  cadence: string;
  signal: PredictionSignal;
  confidencePct: number;
  predictionValue: number;
  predictionTargetLabel: string;
  predictionTargetDisplay: string;
  predictionDataSource: string;
  riskLevel: PredictionRiskLevel;
  accuracy: number | null;
  accuracyStatus: string;
  modelVersion: string | null;
}
