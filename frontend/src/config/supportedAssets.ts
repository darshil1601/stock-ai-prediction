import type { SupportedPredictionSymbol } from "../types/prediction";

export interface SupportedPredictionAsset {
  symbol: SupportedPredictionSymbol;
  routeSymbol: SupportedPredictionSymbol;
  apiSymbol: SupportedPredictionSymbol;
  displayName: string;
  market: string;
  cadence: string;
}

export const SUPPORTED_PREDICTION_ASSETS: SupportedPredictionAsset[] = [
  {
    symbol: "GOLD",
    routeSymbol: "GOLD",
    apiSymbol: "GOLD",
    displayName: "Gold",
    market: "XAU/USD",
    cadence: "Next daily close",
  },
  {
    symbol: "EURUSD",
    routeSymbol: "EURUSD",
    apiSymbol: "EURUSD",
    displayName: "Euro / U.S. Dollar",
    market: "EUR/USD",
    cadence: "Next daily close",
  },
  {
    symbol: "BTC",
    routeSymbol: "BTC",
    apiSymbol: "BTC",
    displayName: "Bitcoin",
    market: "BTC/USD",
    cadence: "Next 1H close",
  },
];

const SUPPORTED_LOOKUP = new Map<string, SupportedPredictionAsset>();
for (const asset of SUPPORTED_PREDICTION_ASSETS) {
  for (const alias of [
    asset.symbol,
    asset.routeSymbol,
    asset.apiSymbol,
    asset.market,
  ]) {
    SUPPORTED_LOOKUP.set(alias.toUpperCase(), asset);
  }
}

SUPPORTED_LOOKUP.set("XAUUSD", SUPPORTED_PREDICTION_ASSETS[0]);
SUPPORTED_LOOKUP.set("XAU/USD", SUPPORTED_PREDICTION_ASSETS[0]);
SUPPORTED_LOOKUP.set("BTCUSD", SUPPORTED_PREDICTION_ASSETS[2]);
SUPPORTED_LOOKUP.set("BTC/USDT", SUPPORTED_PREDICTION_ASSETS[2]);
SUPPORTED_LOOKUP.set("BTCUSDT", SUPPORTED_PREDICTION_ASSETS[2]);
SUPPORTED_LOOKUP.set("BTC/USD", SUPPORTED_PREDICTION_ASSETS[2]);
SUPPORTED_LOOKUP.set("EUR/USD", SUPPORTED_PREDICTION_ASSETS[1]);

export function getSupportedPredictionAsset(symbol: string): SupportedPredictionAsset | null {
  return SUPPORTED_LOOKUP.get((symbol || "").trim().toUpperCase()) ?? null;
}

export function isSupportedPredictionAsset(symbol: string): boolean {
  return getSupportedPredictionAsset(symbol) !== null;
}
