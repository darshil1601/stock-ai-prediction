// ─── Types ────────────────────────────────────────────────────────────────────
export type PredictionTimeframe =
  | "1D" | "1Week" | "30Days" | "3Month" | "6Month" | "1Year";

export type PredictionTrend   = "Bullish" | "Bearish" | "Neutral";
export type PredictionRisk    = "Low" | "Medium" | "High";

export interface PredictionItem {
  symbol:      string;
  company:     string;
  trend:       PredictionTrend;
  probability: number;          // 0 – 100
  target:      number;          // predicted price in ₹
  risk:        PredictionRisk;
  industry:    string;
  timeframe:   PredictionTimeframe;
}

// ─── Industry master list ─────────────────────────────────────────────────────
export const INDUSTRIES = [
  "All Industries",
  "Banking",
  "IT",
  "Pharma",
  "Energy",
  "FMCG",
  "Auto",
  "Crypto",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

// ─── Static dummy predictions (24 rows, all timeframes covered) ───────────────
export const predictionData: PredictionItem[] = [
  // ── IT ─────────────────────────────────────────────────────────────────────
  {
    symbol: "TCS",      company: "Tata Consultancy Services",
    trend: "Bullish",   probability: 88, target: 3_870,
    risk: "Low",        industry: "IT",        timeframe: "1D",
  },
  {
    symbol: "INFY",     company: "Infosys",
    trend: "Bullish",   probability: 81, target: 1_960,
    risk: "Low",        industry: "IT",        timeframe: "1Week",
  },
  {
    symbol: "WIPRO",    company: "Wipro",
    trend: "Bearish",   probability: 74, target: 312,
    risk: "High",       industry: "IT",        timeframe: "30Days",
  },
  {
    symbol: "HCLTECH",  company: "HCL Technologies",
    trend: "Neutral",   probability: 62, target: 1_420,
    risk: "Medium",     industry: "IT",        timeframe: "3Month",
  },

  // ── Banking ────────────────────────────────────────────────────────────────
  {
    symbol: "HDFCBANK", company: "HDFC Bank",
    trend: "Bullish",   probability: 83, target: 1_680,
    risk: "Low",        industry: "Banking",   timeframe: "1D",
  },
  {
    symbol: "ICICIBANK",company: "ICICI Bank",
    trend: "Bearish",   probability: 71, target: 810,
    risk: "Medium",     industry: "Banking",   timeframe: "1Week",
  },
  {
    symbol: "SBIN",     company: "State Bank of India",
    trend: "Neutral",   probability: 58, target: 695,
    risk: "Medium",     industry: "Banking",   timeframe: "30Days",
  },
  {
    symbol: "AXISBANK", company: "Axis Bank",
    trend: "Bullish",   probability: 76, target: 1_110,
    risk: "Low",        industry: "Banking",   timeframe: "6Month",
  },

  // ── Pharma ─────────────────────────────────────────────────────────────────
  {
    symbol: "SUNPHARMA",company: "Sun Pharmaceutical",
    trend: "Bullish",   probability: 79, target: 1_350,
    risk: "Low",        industry: "Pharma",    timeframe: "1D",
  },
  {
    symbol: "DRREDDY",  company: "Dr. Reddy's Laboratories",
    trend: "Neutral",   probability: 64, target: 5_820,
    risk: "Medium",     industry: "Pharma",    timeframe: "3Month",
  },
  {
    symbol: "CIPLA",    company: "Cipla",
    trend: "Bullish",   probability: 72, target: 1_185,
    risk: "Low",        industry: "Pharma",    timeframe: "1Year",
  },

  // ── Energy ─────────────────────────────────────────────────────────────────
  {
    symbol: "RELIANCE", company: "Reliance Industries",
    trend: "Bullish",   probability: 85, target: 3_150,
    risk: "Low",        industry: "Energy",    timeframe: "1D",
  },
  {
    symbol: "ONGC",     company: "Oil & Natural Gas Corp",
    trend: "Bearish",   probability: 68, target: 158,
    risk: "High",       industry: "Energy",    timeframe: "1Week",
  },
  {
    symbol: "NTPC",     company: "NTPC",
    trend: "Neutral",   probability: 60, target: 278,
    risk: "Medium",     industry: "Energy",    timeframe: "6Month",
  },

  // ── FMCG ───────────────────────────────────────────────────────────────────
  {
    symbol: "HINDUNILVR",company: "Hindustan Unilever",
    trend: "Bullish",   probability: 77, target: 2_750,
    risk: "Low",        industry: "FMCG",      timeframe: "1D",
  },
  {
    symbol: "ITC",      company: "ITC",
    trend: "Bullish",   probability: 80, target: 465,
    risk: "Low",        industry: "FMCG",      timeframe: "30Days",
  },
  {
    symbol: "NESTLEIND",company: "Nestlé India",
    trend: "Neutral",   probability: 61, target: 24_200,
    risk: "Medium",     industry: "FMCG",      timeframe: "3Month",
  },

  // ── Auto ───────────────────────────────────────────────────────────────────
  {
    symbol: "TATAMOTORS",company: "Tata Motors",
    trend: "Bearish",   probability: 73, target: 755,
    risk: "High",       industry: "Auto",      timeframe: "1D",
  },
  {
    symbol: "MARUTI",   company: "Maruti Suzuki",
    trend: "Bullish",   probability: 82, target: 12_400,
    risk: "Low",        industry: "Auto",      timeframe: "1Week",
  },
  {
    symbol: "BAJAJ-AUTO",company: "Bajaj Auto",
    trend: "Neutral",   probability: 66, target: 8_950,
    risk: "Medium",     industry: "Auto",      timeframe: "1Year",
  },

  // ── Crypto ─────────────────────────────────────────────────────────────────
  {
    symbol: "BTCUSDT",  company: "Bitcoin",
    trend: "Bullish",   probability: 78, target: 47_500,
    risk: "High",       industry: "Crypto",    timeframe: "1D",
  },
  {
    symbol: "ETHUSDT",  company: "Ethereum",
    trend: "Bearish",   probability: 70, target: 3_050,
    risk: "High",       industry: "Crypto",    timeframe: "1Week",
  },
  {
    symbol: "SOLUSDT",  company: "Solana",
    trend: "Bullish",   probability: 84, target: 118,
    risk: "High",       industry: "Crypto",    timeframe: "30Days",
  },
  {
    symbol: "BNBUSDT",  company: "BNB",
    trend: "Neutral",   probability: 59, target: 335,
    risk: "Medium",     industry: "Crypto",    timeframe: "3Month",
  },
];
