// ─── Markets Dashboard Types ──────────────────────────────────────────────────

export type MarketCategory =
  | "Stocks"
  | "Indices"
  | "Commodities"
  | "Forex"
  | "Crypto";

export type AISignal =
  | "Strong Buy"
  | "Buy"
  | "Neutral"
  | "Sell"
  | "Strong Sell";

export type MarketSector =
  | "Technology"
  | "Banking"
  | "Energy"
  | "Metals"
  | "Auto"
  | "Pharma"
  | "FMCG"
  | "Index"
  | "Currency"
  | "Digital Asset"
  | "Commodity";

export interface MarketItem {
  symbol: string;
  company: string;
  price: number;
  changePercent: number;
  volume: number;       // in units (shares / lots / coins)
  marketCap: number;   // in Crores (INR) or USD Bn for crypto/forex
  rsi: number;          // 0–100
  aiSignal: AISignal;
  category: MarketCategory;
  sector: MarketSector;
}
