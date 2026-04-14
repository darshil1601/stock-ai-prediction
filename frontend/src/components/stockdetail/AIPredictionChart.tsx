import React, { useMemo, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { EntryExitZones, ForecastMeta, MarketIntelligence, RiskMetrics } from "../../types/stock";
import { formatCurrency } from "../../lib/utils";
import { api } from "../../services/api";

// ── Types ────────────────────────────────────────────────────────────────────
interface PricePoint { date: string; price: number }

interface ApiPayload {
  historical:  PricePoint[];
  predicted:   PricePoint[];
  next_price:  number;
  signal:      "BUY" | "SELL" | "HOLD";
  confidence:  number;
  accuracy:    number;
  model:       string;
  generated_at: string;
  symbol:      string;
  entry_exit_zones: EntryExitZones;
  risk_metrics: RiskMetrics;
  market_intelligence?: MarketIntelligence;
  forecast_meta?: ForecastMeta;
}

interface Props {
  symbol?: string;
  onApiData?: (data: ApiPayload) => void;
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const get = (key: string) =>
    payload.find((p: any) => p.dataKey === key)?.value ?? null;

  const actual    = get("actual");
  const predicted = get("predicted");

  const fmt = (v: number | null) =>
    v != null ? formatCurrency(v, "USD") : "—";

  return (
    <div className="bg-[#0b1220] border border-slate-700/50 rounded-xl shadow-2xl p-3 text-[10px] sm:text-xs min-w-[140px] sm:min-w-[160px]">
      <div className="text-slate-500 font-bold mb-2 border-b border-white/5 pb-1.5 uppercase tracking-widest">{label}</div>
      {actual != null && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          <span className="text-slate-400 font-medium">Actual Price:</span>
          <span className="text-slate-100 font-bold ml-auto tabular-nums">{fmt(actual)}</span>
        </div>
      )}
      {predicted != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.4)]" />
          <span className="text-slate-400 font-medium">AI Forecast:</span>
          <span className="text-slate-100 font-bold ml-auto tabular-nums">{fmt(predicted)}</span>
        </div>
      )}
    </div>
  );
};

// ── Signal badge colours ──────────────────────────────────────────────────────
const SIGNAL_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  BUY:  { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
  SELL: { bg: "bg-rose-500/10 border-rose-500/20",       text: "text-rose-400",    dot: "bg-rose-400"    },
  HOLD: { bg: "bg-amber-500/10 border-amber-500/20",     text: "text-amber-400",   dot: "bg-amber-400"   },
};

// ── Main Chart ────────────────────────────────────────────────────────────────
export default function AIPredictionChart({ symbol = "gold", onApiData }: Props) {
  const [apiData, setApiData]     = useState<ApiPayload | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Fetch from backend
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.getPrediction(symbol)
      .then((payload: ApiPayload) => {
        if (!cancelled) {
          setApiData(payload);
          setLoading(false);
          if (onApiData) onApiData(payload);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [symbol]);

  // ── Build chart data ────────────────────────────────────────────────────────
  const { chartData, todayDate, accuracy, signal, confidence, model } = useMemo(() => {
    if (!apiData) {
      return { 
        chartData: [], 
        todayDate: null, 
        accuracy: 0, 
        signal: "HOLD" as const, 
        confidence: 0, 
        model: "Syncing..." 
      };
    }

    const merged: Array<{
      date: string; 
      actual: number | null; 
      predicted: number | null;
      bandBase: number | null; 
      bandWidth: number | null;
    }> = [];

    // Historical actual prices
    for (const h of apiData.historical) {
      merged.push({ date: h.date.slice(5), actual: h.price, predicted: null, bandBase: null, bandWidth: null });
    }

    // Bridge: last historical point also on predicted line
    const lastH = apiData.historical.at(-1);
    if (lastH && apiData.predicted.length) {
      merged.push({ date: lastH.date.slice(5), actual: lastH.price, predicted: lastH.price, bandBase: null, bandWidth: null });
    }

    // Future predicted prices with confidence band
    const bandPct = (apiData.forecast_meta?.confidence_band_pct ?? 1.5) / 100;
    const band = apiData.next_price * bandPct;
    for (const p of apiData.predicted) {
      merged.push({
        date:       p.date.slice(5),
        actual:     null,
        predicted:  p.price,
        bandBase:   p.price - band,
        bandWidth:  band * 2,
      });
    }

    const todayDate = lastH?.date.slice(5) ?? null;

    return {
      chartData:  merged,
      todayDate,
      accuracy:   apiData.accuracy,
      signal:     apiData.signal,
      confidence: apiData.confidence,
      model:      apiData.model,
    };
  }, [apiData]);

  // ── Y-axis formatter ────────────────────────────────────────────────────────
  const yTickFmt = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  };

  const sigStyle = SIGNAL_STYLE[signal] ?? SIGNAL_STYLE["HOLD"];

  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* ── Background Glow ── */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-violet-500/5 blur-[120px] pointer-events-none" />

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)] flex-shrink-0" />
          <div>
            <span className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-widest">Neural Forecast Overlay</span>
            <div className="flex items-center gap-2 mt-0.5">
              {loading && <span className="text-[10px] text-slate-500 animate-pulse uppercase font-bold tracking-tight">Syncing Engine…</span>}
              {apiData && <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
                Live Neural Stream
              </span>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            {/* Legend */}
            <div className="flex flex-shrink-0 items-center gap-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                <div className="flex items-center gap-2">
                    <span className="w-4 h-0.5 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.3)]" />
                    <span>Actual Price</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-4 border-t-2 border-dashed border-emerald-400" />
                    <span>AI Forecast</span>
                </div>
            </div>

            <button 
                onClick={() => document.getElementById('performance-audit')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 hover:text-slate-100 transition-all active:scale-95"
            >
                Audit Log
            </button>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 relative z-10">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score:</span>
            <span className="text-xs font-black text-violet-400">{accuracy}%</span>
        </div>
        
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/10 border border-violet-500/20">
            <span className="text-xs font-black text-violet-300 uppercase tracking-tight">{model}</span>
        </div>

        {/* Signal */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm ${sigStyle.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sigStyle.dot} shadow-[0_0_8px_currentColor]`} />
          <span className={`text-xs font-black uppercase tracking-tight ${sigStyle.text}`}>{signal}</span>
        </div>

        {/* Confidence */}
        <div className="px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-1.5">
           <span className="text-[10px] font-bold text-slate-500 uppercase">Trust:</span>
           <span className="text-xs font-black text-slate-200 tabular-nums">{Math.round(confidence * 100)}%</span>
        </div>

        {/* Next price */}
        {apiData && (
          <div className="sm:ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600/10 border border-emerald-500/20">
             <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Target:</span>
             <span className="text-sm font-black text-emerald-300 tabular-nums">
               {formatCurrency(apiData.next_price, "USD")}
             </span>
          </div>
        )}
      </div>

      {/* ── Market Intelligence Alert Strip ── */}
      {apiData?.market_intelligence && apiData.market_intelligence.market_alert !== "normal" && (
        <div className={`rounded-2xl border px-4 py-3 mb-4 flex items-start sm:items-center gap-3 relative z-10 shadow-lg ${
          apiData.market_intelligence.market_alert === "danger"  ? "bg-rose-500/10 border-rose-500/25"   :
          apiData.market_intelligence.market_alert === "warning" ? "bg-orange-500/10 border-orange-500/25" :
                                                                    "bg-amber-500/10 border-amber-500/25"
        }`}>
          <span className="text-xl leading-none flex-shrink-0 mt-0.5 sm:mt-0">
            {apiData.market_intelligence.market_alert === "danger"  ? "🚨" :
             apiData.market_intelligence.market_alert === "warning" ? "⚠️" : "💡"}
          </span>
          <div className="flex-1 min-w-0">
            <div className={`text-[11px] font-black uppercase tracking-widest mb-1 ${
              apiData.market_intelligence.market_alert === "danger"  ? "text-rose-400"   :
              apiData.market_intelligence.market_alert === "warning" ? "text-orange-400" : "text-amber-400"
            }`}>
              {apiData.market_intelligence.event_detected
                ? `Volatility Spike — ${apiData.market_intelligence.spike_ratio.toFixed(1)}x Deviation`
                : `Market News Stream — Sentiment: ${apiData.market_intelligence.sentiment_label ?? "Neutral"}`
              }
            </div>
            {apiData.market_intelligence.warnings.slice(0, 1).map((w, i) => (
              <p key={i} className="text-xs text-slate-400 leading-snug font-medium italic truncate">{w}</p>
            ))}
          </div>
          <div className="text-right flex-shrink-0 hidden sm:block">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Certainty</div>
            <div className={`text-sm font-black tabular-nums ${
              apiData.market_intelligence.market_alert === "danger"  ? "text-rose-400"   :
              apiData.market_intelligence.market_alert === "warning" ? "text-orange-400" : "text-amber-400"
            }`}>{Math.round(confidence * 100)}%</div>
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      <div className="relative z-10" style={{ height: window.innerWidth < 640 ? 250 : 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="confBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />

            <XAxis
              dataKey="date"
              stroke="#334155"
              tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#334155"
              tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              width={54}
              tickFormatter={yTickFmt}
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />

            <Area type="monotone" dataKey="bandBase"  stackId="band" stroke="none" fill="transparent" dot={false} legendType="none" isAnimationActive={false} />
            <Area type="monotone" dataKey="bandWidth" stackId="band" stroke="rgba(124,58,237,0.2)" strokeWidth={1} strokeDasharray="3 3" fill="url(#confBandGrad)" dot={false} legendType="none" isAnimationActive={false} />

            <Line type="monotone" dataKey="actual"    stroke="#60a5fa" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive animationDuration={1000} shadow="0 0 10px rgba(96,165,250,0.5)" />
            <Line type="monotone" dataKey="predicted" stroke="#34d399" strokeWidth={2.5} strokeDasharray="6 4" dot={false} connectNulls={false} isAnimationActive animationDuration={1000} />

            {todayDate && (
              <ReferenceLine
                x={todayDate}
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 4"
                label={{ value: "Now", fill: "#94a3b8", fontSize: 10, fontWeight: 700, position: "insideTopRight" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
