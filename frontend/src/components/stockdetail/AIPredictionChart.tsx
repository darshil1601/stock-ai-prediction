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

const BACKEND = "http://localhost:8000";

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
    <div className="bg-[#0d1526] border border-slate-700/50 rounded-xl shadow-2xl p-3 text-xs min-w-[160px]">
      <div className="text-slate-400 font-medium mb-2 border-b border-white/5 pb-1.5">{label}</div>
      {actual != null && (
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          <span className="text-slate-400">Actual:</span>
          <span className="text-slate-100 font-semibold ml-auto tabular-nums">{fmt(actual)}</span>
        </div>
      )}
      {predicted != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-slate-400">Predicted:</span>
          <span className="text-slate-100 font-semibold ml-auto tabular-nums">{fmt(predicted)}</span>
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

    fetch(`${BACKEND}/api/${symbol.toLowerCase()}/predict`)
      .then((r) => {
        if (!r.ok) throw new Error(`Backend ${r.status}: ${r.statusText}`);
        return r.json();
      })
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
        model: "Loading..." 
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
    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)] flex-shrink-0" />
          <div>
            <span className="text-sm font-black text-slate-100 uppercase tracking-widest">AI Prediction Overlay</span>
            <div className="flex items-center gap-2 mt-0.5">
              {loading && <span className="text-[10px] text-slate-500 animate-pulse uppercase font-bold tracking-tighter">Syncing Engine…</span>}
              {error && <span className="text-[10px] text-amber-500/80 font-bold uppercase tracking-tighter">⚠ Mode: Simulation</span>}
              {apiData && <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                Live Neural Feed
              </span>}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-6">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-5 text-[10px] font-bold uppercase tracking-tighter text-slate-500">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-blue-400 rounded-full" />
                    <span>Actual</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 border-t border-dashed border-emerald-400" />
                    <span>Forecast</span>
                </div>
            </div>

            <button 
                onClick={() => document.getElementById('performance-audit')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
            >
                View Audit
            </button>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <span className="text-xs text-slate-500">Prediction Accuracy (Past 30 Days):</span>
        <span className="text-xs font-bold text-violet-400">{accuracy}%</span>
        <span className="text-xs px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
          {model}
        </span>

        {/* Signal */}
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${sigStyle.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sigStyle.dot}`} />
          <span className={`text-xs font-semibold ${sigStyle.text}`}>{signal}</span>
        </div>

        {/* Confidence */}
        <span className="text-xs text-slate-500">
          Confidence: <span className="text-slate-300 font-semibold">{Math.round(confidence * 100)}%</span>
        </span>

        {/* Next price */}
        {apiData && (
          <span className="text-xs text-slate-500 ml-auto">
            Next price:{" "}
            <span className="text-emerald-400 font-semibold tabular-nums">
              {formatCurrency(apiData.next_price, "USD")}
            </span>
          </span>
        )}
      </div>

      {/* ── Market Intelligence Alert Strip (event/news warning) ── */}
      {apiData?.market_intelligence && apiData.market_intelligence.market_alert !== "normal" && (
        <div className={`rounded-xl border px-3 py-2.5 mb-1 flex items-start gap-2.5 ${
          apiData.market_intelligence.market_alert === "danger"  ? "bg-rose-500/10 border-rose-500/25"   :
          apiData.market_intelligence.market_alert === "warning" ? "bg-orange-500/10 border-orange-500/25" :
                                                                    "bg-amber-500/10 border-amber-500/25"
        }`}>
          <span className="text-base leading-none flex-shrink-0">
            {apiData.market_intelligence.market_alert === "danger"  ? "🔴" :
             apiData.market_intelligence.market_alert === "warning" ? "🟠" : "🟡"}
          </span>
          <div className="flex-1 min-w-0">
            <div className={`text-[11px] font-bold mb-0.5 ${
              apiData.market_intelligence.market_alert === "danger"  ? "text-rose-400"   :
              apiData.market_intelligence.market_alert === "warning" ? "text-orange-400" : "text-amber-400"
            }`}>
              {apiData.market_intelligence.event_detected
                ? `High Volatility Event — ${apiData.market_intelligence.spike_ratio.toFixed(1)}× normal move detected`
                : `News sentiment — ${(apiData.market_intelligence.sentiment_score ?? 0).toFixed(2)} (${apiData.market_intelligence.sentiment_label ?? "neutral"}) · Event ${apiData.market_intelligence.event_tier ?? "LOW"}`
              }
            </div>
            {apiData.market_intelligence.warnings.slice(0, 1).map((w, i) => (
              <p key={i} className="text-[10px] text-slate-400 leading-snug truncate">{w}</p>
            ))}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] text-slate-500">Confidence</div>
            <div className={`text-xs font-bold ${
              apiData.market_intelligence.market_alert === "danger"  ? "text-rose-400"   :
              apiData.market_intelligence.market_alert === "warning" ? "text-orange-400" : "text-amber-400"
            }`}>{Math.round(confidence * 100)}%</div>
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      <div style={{ height: 290 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="confBandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.20} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.04} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

            <XAxis
              dataKey="date"
              stroke="#334155"
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#334155"
              tick={{ fill: "#64748b", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
              width={64}
              tickFormatter={yTickFmt}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Confidence band */}
            <Area type="monotone" dataKey="bandBase"  stackId="band" stroke="none" fill="transparent" dot={false} legendType="none" isAnimationActive={false} />
            <Area type="monotone" dataKey="bandWidth" stackId="band" stroke="rgba(124,58,237,0.25)" strokeWidth={1} strokeDasharray="3 3" fill="url(#confBandGrad)" dot={false} legendType="none" isAnimationActive={false} />

            {/* Actual price line */}
            <Line type="monotone" dataKey="actual"    stroke="#60a5fa" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive animationDuration={800} />

            {/* Predicted price line */}
            <Line type="monotone" dataKey="predicted" stroke="#34d399" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls={false} isAnimationActive animationDuration={800} />

            {/* Today marker */}
            {todayDate && (
              <ReferenceLine
                x={todayDate}
                stroke="rgba(255,255,255,0.18)"
                strokeDasharray="4 4"
                label={{ value: "Today", fill: "#64748b", fontSize: 10, position: "insideTopRight" }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
