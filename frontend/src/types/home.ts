export interface MarketIndex {
  label: string;
  symbol: string;
  price: number;
  change: number;      // percentage
  sparkline: number[];
}

export interface AISentiment {
  bullishPercent: number; // 0–100
  label: string;          // e.g. "Moderately Bullish"
  description: string;
}

export type SignalStrength = "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";
export type RiskLevel = "Low" | "Medium" | "High";

export interface AIPick {
  symbol: string;
  name: string;
  signal: SignalStrength;
  confidence: number; // 0–100
  risk: RiskLevel;
  price: number;
  change: number;
  sparkline: number[];
}
