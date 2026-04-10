import { allAssets } from "../data/homeData";

export function formatCurrency(v: number, currency = "INR") {
  const isUSD = currency === "USD";
  // Increase precision for small values (like EURUSD)
  const precision = (v < 100 && isUSD) ? 4 : 2;
  return v.toLocaleString(isUSD ? "en-US" : "en-IN", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  });
}

export function getMarketStatus() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  // Simple market open window 09:15 - 15:30 local
  const time = hours * 60 + minutes;
  const open = 9 * 60 + 15;
  const close = 15 * 60 + 30;
  return time >= open && time <= close ? "Open" : "Closed";
}

export function deterministicPredictionSeed(sym: string) {
  let s = 0;
  for (let i = 0; i < sym.length; i++) s = (s * 31 + sym.charCodeAt(i)) % 1000;
  return s;
}

// Map app symbol to TradingView exchange:symbol format
export function getFormattedSymbol(symbol: string): string {
  const sym = (symbol || "").toUpperCase().trim();

  // 1. If it already has a colon, it's already "Perfect"
  if (sym.includes(":")) return sym;

  // 2. Explicit mappings for common assets
  if (sym === "GOLD" || sym === "XAUUSD") return "OANDA:XAUUSD";
  if (sym === "EURUSD") return "OANDA:EURUSD";
  if (sym === "BTC" || sym === "BTCUSD" || sym === "BTCUSDT") return "COINBASE:BTCUSD";

  const asset = allAssets.find((a) => a.symbol === sym);

  if (asset) {
    switch (asset.category) {
      case "Stock":
        return `NSE:${sym}`;
      case "Commodity":
        return `MCX:${sym}`;
      case "Crypto":
        return `BINANCE:${sym}`;
      case "Forex":
        return `FX:${sym}`;
    }
  }

  // Fallback heuristics
  if (sym.endsWith("USDT")) return `BINANCE:${sym}`;
  
  // Default to NSE for Indian stocks
  return `NSE:${sym}`;
}

// Lightweight debounce helper (not exported by default UI hooks use it)
export function debounce<T extends (...args: any[]) => any>(fn: T, wait = 300) {
  let t: any = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
