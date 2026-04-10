import type { Asset } from "../types/stock";
import type { MarketIndex, AISentiment, AIPick } from "../types/home";

// ─── Market Overview Cards ────────────────────────────────────────────────────
export const marketIndices: MarketIndex[] = [
  {
    label: "NIFTY 50",
    symbol: "NIFTY50",
    price: 22_345.65,
    change: 0.72,
    sparkline: [22100, 22150, 22080, 22200, 22180, 22260, 22310, 22346],
  },
  {
    label: "SENSEX",
    symbol: "SENSEX",
    price: 73_812.34,
    change: 0.58,
    sparkline: [73200, 73350, 73180, 73500, 73420, 73650, 73780, 73812],
  },
  {
    label: "BANKNIFTY",
    symbol: "BANKNIFTY",
    price: 47_921.15,
    change: -0.34,
    sparkline: [48200, 48100, 48050, 47980, 48020, 47960, 47930, 47921],
  },
  {
    label: "GOLD",
    symbol: "GOLD",
    price: 5183.5,
    change: 1.12,
    sparkline: [5160, 5165, 5172, 5175, 5178, 5180, 5182, 5183.5],
  },
];

// ─── AI Market Sentiment ──────────────────────────────────────────────────────
export const aiSentiment: AISentiment = {
  bullishPercent: 68,
  label: "Moderately Bullish",
  description:
    "AI models analysed 4,200+ signals across technicals, news and options flow. Market breadth is improving with FII net buying of ₹2,340 Cr today.",
};

// ─── Extended Asset Data (with sparklines + more losers for Top 5) ────────────
export const assets: Asset[] = [
  // ── Stocks ──────────────────────────────────────────────────────────────────
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    price: 3_456.12,
    change: 3.42,
    category: "Stock",
    sparkline: [3380, 3400, 3390, 3420, 3410, 3440, 3450, 3456],
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank",
    price: 1_543.5,
    change: 2.15,
    category: "Stock",
    sparkline: [1500, 1510, 1505, 1520, 1518, 1530, 1540, 1543],
  },
  {
    symbol: "INFY",
    name: "Infosys",
    price: 1_821.8,
    change: 1.98,
    category: "Stock",
    sparkline: [1780, 1790, 1785, 1800, 1798, 1810, 1818, 1821],
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    price: 2_915.0,
    change: 1.45,
    category: "Stock",
    sparkline: [2870, 2880, 2875, 2890, 2900, 2905, 2910, 2915],
  },
  {
    symbol: "BAJFINANCE",
    name: "Bajaj Finance",
    price: 7_231.0,
    change: 0.88,
    category: "Stock",
    sparkline: [7160, 7175, 7165, 7190, 7200, 7215, 7225, 7231],
  },
  {
    symbol: "WIPRO",
    name: "Wipro",
    price: 342.3,
    change: -2.35,
    category: "Stock",
    sparkline: [355, 352, 350, 348, 346, 344, 343, 342],
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank",
    price: 849.0,
    change: -1.72,
    category: "Stock",
    sparkline: [868, 865, 862, 859, 856, 853, 850, 849],
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    price: 678.45,
    change: -1.05,
    category: "Stock",
    sparkline: [686, 685, 683, 682, 681, 680, 679, 678],
  },
  {
    symbol: "AXISBANK",
    name: "Axis Bank",
    price: 1_023.0,
    change: -0.88,
    category: "Stock",
    sparkline: [1033, 1031, 1030, 1028, 1027, 1025, 1024, 1023],
  },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors",
    price: 812.6,
    change: -0.62,
    category: "Stock",
    sparkline: [820, 818, 817, 816, 815, 814, 813, 812],
  },

  // ── Commodities ──────────────────────────────────────────────────────────────
  {
    symbol: "GOLD",
    name: "Gold",
    price: 5183.5,
    change: 1.12,
    category: "Commodity",
    sparkline: [5160, 5165, 5172, 5175, 5178, 5180, 5182, 5183.5],
  },
  {
    symbol: "SILVER",
    name: "Silver",
    price: 670.25,
    change: -0.45,
    category: "Commodity",
    sparkline: [676, 675, 674, 673, 672, 671, 671, 670],
  },
  {
    symbol: "CRUDEOIL",
    name: "Crude Oil",
    price: 6_120.5,
    change: 1.32,
    category: "Commodity",
    sparkline: [6020, 6040, 6060, 6080, 6090, 6100, 6110, 6120],
  },
  {
    symbol: "NATURALGAS",
    name: "Natural Gas",
    price: 198.75,
    change: -1.8,
    category: "Commodity",
    sparkline: [204, 202, 201, 200, 199, 199, 199, 198],
  },
  {
    symbol: "COPPER",
    name: "Copper",
    price: 745.6,
    change: 0.62,
    category: "Commodity",
    sparkline: [740, 741, 742, 743, 744, 744, 745, 745],
  },

  // ── Crypto ───────────────────────────────────────────────────────────────────
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 71_413,
    change: -3.40,
    category: "Crypto",
    sparkline: [73928, 73600, 73200, 72800, 72400, 72000, 71600, 71413],
  },
  {
    symbol: "BTCUSDT",
    name: "Bitcoin (USDT)",
    price: 71_413,
    change: -3.40,
    category: "Crypto",
    sparkline: [73928, 73600, 73200, 72800, 72400, 72000, 71600, 71413],
  },
  {
    symbol: "ETHUSDT",
    name: "Ethereum",
    price: 3_201.99,
    change: -2.1,
    category: "Crypto",
    sparkline: [3280, 3260, 3245, 3230, 3220, 3215, 3207, 3202],
  },
  {
    symbol: "SOLUSDT",
    name: "Solana",
    price: 102.45,
    change: 3.12,
    category: "Crypto",
    sparkline: [99, 99.5, 100, 100.8, 101.2, 101.8, 102.1, 102.45],
  },
  {
    symbol: "BNBUSDT",
    name: "BNB",
    price: 314.8,
    change: -1.05,
    category: "Crypto",
    sparkline: [320, 318, 317, 316, 315, 315, 314, 314],
  },
  {
    symbol: "XRPUSDT",
    name: "Ripple (XRP)",
    price: 0.5421,
    change: 1.88,
    category: "Crypto",
    sparkline: [0.53, 0.534, 0.536, 0.538, 0.540, 0.541, 0.541, 0.542],
  },
  {
    symbol: "EURUSD",
    name: "Euro / U.S. Dollar",
    price: 1.1421,
    change: -0.25,
    category: "Forex",
    sparkline: [1.16, 1.155, 1.158, 1.152, 1.15, 1.148, 1.145, 1.142],
  },
];

export const allAssets = assets;

// ─── Featured AI Picks ────────────────────────────────────────────────────────
export const aiPicks: AIPick[] = [
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    signal: "Strong Buy",
    confidence: 91,
    risk: "Low",
    price: 3_456.12,
    change: 3.42,
    sparkline: [3380, 3400, 3390, 3420, 3410, 3440, 3450, 3456],
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    signal: "Buy",
    confidence: 78,
    risk: "High",
    price: 71_413,
    change: -3.40,
    sparkline: [73928, 73600, 73200, 72800, 72400, 72000, 71600, 71413],
  },
  {
    symbol: "GOLD",
    name: "Gold",
    signal: "Buy",
    confidence: 83,
    risk: "Low",
    price: 5183.5,
    change: 1.12,
    sparkline: [5160, 5165, 5172, 5175, 5178, 5180, 5182, 5183.5],
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    signal: "Hold",
    confidence: 65,
    risk: "Medium",
    price: 2_915.0,
    change: 1.45,
    sparkline: [2870, 2880, 2875, 2890, 2900, 2905, 2910, 2915],
  },
  {
    symbol: "SOLUSDT",
    name: "Solana",
    signal: "Strong Buy",
    confidence: 87,
    risk: "High",
    price: 102.45,
    change: 3.12,
    sparkline: [99, 99.5, 100, 100.8, 101.2, 101.8, 102.1, 102.45],
  },
  {
    symbol: "EURUSD",
    name: "Euro / U.S. Dollar",
    signal: "Hold",
    confidence: 60,
    risk: "High",
    price: 1.1421,
    change: -0.25,
    sparkline: [1.16, 1.155, 1.158, 1.152, 1.15, 1.148, 1.145, 1.142],
  },
];
