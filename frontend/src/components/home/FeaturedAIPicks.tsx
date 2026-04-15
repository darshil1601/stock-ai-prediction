import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

import { SUPPORTED_PREDICTION_ASSETS } from "../../config/supportedAssets";
import { api } from "../../services/api";
import type { PredictionApiPayload } from "../../types/prediction";
import type { SignalStrength, RiskLevel } from "../../types/home";

interface PickCardModel {
  symbol: string;
  name: string;
  signal: SignalStrength;
  confidence: number;
  risk: RiskLevel;
  predictionValue: number;
  targetLabel: string;
  targetDisplay: string;
  sparkline: number[];
}

const signalStyles: Record<SignalStrength, string> = {
  "Strong Buy": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Buy: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  Hold: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Sell: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  "Strong Sell": "bg-rose-700/10 text-rose-400 border border-rose-700/20",
};

const riskStyles: Record<RiskLevel, string> = {
  Low: "text-emerald-400",
  Medium: "text-amber-400",
  High: "text-rose-400",
};

const confBarColor: Record<SignalStrength, string> = {
  "Strong Buy": "#10b981",
  Buy: "#0d9488",
  Hold: "#f59e0b",
  Sell: "#f87171",
  "Strong Sell": "#ef4444",
};

function toSignalStrength(signal: string, confidencePct: number): SignalStrength {
  if (signal === "BUY") return confidencePct >= 80 ? "Strong Buy" : "Buy";
  if (signal === "SELL") return confidencePct >= 80 ? "Strong Sell" : "Sell";
  return "Hold";
}

function toPickModel(assetName: string, payload: PredictionApiPayload): PickCardModel {
  const confidence = Math.max(
    0,
    Math.min(100, payload.risk_metrics?.aiConfidence ?? Math.round(payload.confidence * 100))
  );
  const signal = toSignalStrength(payload.signal, confidence);
  const sparkline = payload.historical.slice(-20).map((row) => row.price);

  return {
    symbol: payload.symbol.replace("/", "").toUpperCase().includes("BTC")
      ? "BTC"
      : payload.symbol.replace("/", "").toUpperCase().includes("EUR")
      ? "EURUSD"
      : "GOLD",
    name: assetName,
    signal,
    confidence,
    risk: payload.risk_metrics?.riskLevel ?? "Medium",
    predictionValue: payload.prediction_value ?? payload.next_price,
    targetLabel: payload.prediction_target_label,
    targetDisplay: payload.prediction_target_display,
    sparkline: sparkline.length > 1 ? sparkline : [payload.prediction_value, payload.prediction_value],
  };
}

const ConfidenceBar = memo(function ConfidenceBar({
  value,
  signal,
}: {
  value: number;
  signal: SignalStrength;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.width = "0%";
    const raf = requestAnimationFrame(() => {
      el.style.transition = "width 1.2s cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.width = `${value}%`;
    });
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-tighter">
        <span className="text-slate-500">AI Trust Score</span>
        <span className="text-slate-200">{value}%</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
        <div
          ref={ref}
          className="h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all"
          style={{ backgroundColor: confBarColor[signal], width: "0%" }}
        />
      </div>
    </div>
  );
});

const PickChart = memo(function PickChart({
  data,
  positive,
}: {
  data: number[];
  positive: boolean;
}) {
  const chartData = data.map((v, i) => ({ i, v }));
  const color = positive ? "#10b981" : "#f87171";

  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={`grad-${positive}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#grad-${positive})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

const TVLivePriceRow = memo(function TVLivePriceRow({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    let tvSymbol = symbol.toUpperCase();
    if (tvSymbol.includes("BTC")) tvSymbol = "COINBASE:BTCUSD";
    else if (tvSymbol.includes("GOLD") || tvSymbol.includes("XAU")) tvSymbol = "OANDA:XAUUSD";
    else if (tvSymbol.includes("EUR")) tvSymbol = "OANDA:EURUSD";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: "100%",
      isTransparent: true,
      colorTheme: "dark",
      locale: "en",
    });

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    wrapper.appendChild(inner);
    wrapper.appendChild(script);
    containerRef.current.appendChild(wrapper);
  }, [symbol]);

  return (
    <div className="pointer-events-none -mx-4 -mt-1 sm:-mt-2 mb-1 min-h-[85px] sm:min-h-[90px]">
      <div ref={containerRef} />
    </div>
  );
});

const PickCard = memo(function PickCard({ pick }: { pick: PickCardModel }) {
  const navigate = useNavigate();
  const positive = pick.signal === "Buy" || pick.signal === "Strong Buy";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/stock/${pick.symbol}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/stock/${pick.symbol}`)}
      className="group relative cursor-pointer bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:bg-slate-800/60 hover:border-slate-700 active:scale-[0.98]"
    >
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10">
        <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tight ${signalStyles[pick.signal]}`}>
          {pick.signal}
        </span>
      </div>

      <TVLivePriceRow symbol={pick.symbol} />

      <div className="-mx-1 mb-3 sm:mb-4">
        <PickChart data={pick.sparkline} positive={positive} />
      </div>

      <div className="space-y-1 mb-3">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          {pick.targetLabel}
        </div>
        <div className="text-sm sm:text-base font-black text-slate-100 tabular-nums">
          {pick.predictionValue.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: pick.predictionValue < 100 ? 4 : 2,
          })}
        </div>
        <div className="text-[10px] text-slate-500">{pick.targetDisplay}</div>
      </div>

      <ConfidenceBar value={pick.confidence} signal={pick.signal} />

      <div className="mt-3 sm:mt-4 flex items-center justify-between text-[10px] sm:text-[11px] font-bold uppercase tracking-tighter">
        <span className="text-slate-500">Risk Profile</span>
        <span className={riskStyles[pick.risk]}>{pick.risk} Risk</span>
      </div>
    </div>
  );
});

export default function FeaturedAIPicks() {
  const [picks, setPicks] = useState<PickCardModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all(
      SUPPORTED_PREDICTION_ASSETS.map((asset) =>
        api.getPrediction(asset.apiSymbol).then((payload: PredictionApiPayload) =>
          toPickModel(asset.displayName, payload)
        )
      )
    )
      .then((results) => {
        if (!mounted) return;
        results.sort((a, b) => b.confidence - a.confidence);
        setPicks(results);
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setError(err.message || "Unable to load prediction feed");
        setPicks([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const subtitle = useMemo(
    () =>
      error
        ? "Backend prediction feed is unavailable"
        : "Predicted targets are backend forecasts. Live prices are from TradingView.",
    [error]
  );

  return (
    <section aria-label="Featured AI Picks" className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-widest uppercase">
            AI Engine
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-2 tracking-tight">
            High Confidence Picks
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
        </div>
        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest hidden sm:block">
          BTC | Gold | EURUSD
        </span>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
          <p className="text-xs sm:text-sm text-rose-100">
            Failed to load backend picks: {error}
          </p>
        </div>
      )}

      {!error && picks.length === 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-xs sm:text-sm text-slate-400">
          Loading picks from backend...
        </div>
      )}

      {!error && picks.length > 0 && (
        <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {picks.map((pick) => (
            <PickCard key={pick.symbol} pick={pick} />
          ))}
        </div>
      )}

      <div className="mt-4 p-3 rounded-xl bg-slate-900/30 border border-slate-800/50 text-center">
        <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
          Predictions are probabilistic. Live TradingView price and backend prediction target represent different time contexts.
        </p>
      </div>
    </section>
  );
}
