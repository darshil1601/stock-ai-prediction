import React, { useEffect, useMemo, useState } from "react";
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

import { getSupportedPredictionAsset } from "../../config/supportedAssets";
import { formatCurrency } from "../../lib/utils";
import { api } from "../../services/api";
import type { PredictionApiPayload } from "../../types/prediction";

interface Props {
  symbol?: string;
  onApiData?: (data: PredictionApiPayload) => void;
}

const SIGNAL_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  BUY: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
  SELL: { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-400", dot: "bg-rose-400" },
  HOLD: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", dot: "bg-amber-400" },
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const get = (key: string) => payload.find((p: any) => p.dataKey === key)?.value ?? null;
  const actual = get("actual");
  const predicted = get("predicted");

  const fmt = (v: number | null) => (v != null ? formatCurrency(v, "USD") : "-");

  return (
    <div className="bg-[#0b1220] border border-slate-700/50 rounded-xl shadow-2xl p-3 text-[10px] sm:text-xs min-w-[150px]">
      <div className="text-slate-500 font-bold mb-2 border-b border-white/5 pb-1.5 uppercase tracking-widest">
        {label}
      </div>
      {actual != null && (
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          <span className="text-slate-400 font-medium">Observed:</span>
          <span className="text-slate-100 font-bold ml-auto tabular-nums">{fmt(actual)}</span>
        </div>
      )}
      {predicted != null && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
          <span className="text-slate-400 font-medium">Predicted:</span>
          <span className="text-slate-100 font-bold ml-auto tabular-nums">{fmt(predicted)}</span>
        </div>
      )}
    </div>
  );
}

export default function AIPredictionChart({ symbol = "gold", onApiData }: Props) {
  const asset = useMemo(() => getSupportedPredictionAsset(symbol), [symbol]);
  const [apiData, setApiData] = useState<PredictionApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!asset) {
      setApiData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getPrediction(asset.apiSymbol)
      .then((payload: PredictionApiPayload) => {
        if (cancelled) return;
        setApiData(payload);
        setLoading(false);
        onApiData?.(payload);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [asset, onApiData]);

  if (!asset) {
    return (
      <div className="bg-[#0b1220] border border-amber-500/30 rounded-2xl p-5 sm:p-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-amber-300">
          Prediction Not Available
        </h3>
        <p className="text-xs sm:text-sm text-amber-100/90 mt-2">
          AI prediction is supported only for BTC, Gold (XAU/USD), and EUR/USD.
        </p>
      </div>
    );
  }

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { merged, formattedToday } = useMemo(() => {
    if (!apiData) {
      return { merged: [], formattedToday: null };
    }

    const isDaily = apiData?.forecast_meta?.history_interval === "1day";

    const formatDate = (raw: string) => {
      if (!raw) return "";
      try {
        const d = new Date(raw);
        if (isDaily) {
          return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        }
        return d.toLocaleTimeString("en-IN", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      } catch {
        return raw.slice(5, 16);
      }
    };

    const result: Array<{
      date: string;
      actual: number | null;
      predicted: number | null;
      bandBase: number | null;
      bandWidth: number | null;
    }> = [];

    for (const row of apiData.historical) {
      result.push({
        date: formatDate(row.date),
        actual: row.price,
        predicted: null,
        bandBase: null,
        bandWidth: null,
      });
    }

    const last = apiData.historical.at(-1);
    const fToday = last ? formatDate(last.date) : null;
    
    if (last && apiData.predicted.length) {
      result.push({
        date: fToday ?? "",
        actual: last.price,
        predicted: last.price,
        bandBase: null,
        bandWidth: null,
      });
    }

    const bandPct = (apiData.forecast_meta?.confidence_band_pct ?? 1.5) / 100;
    const band = apiData.prediction_value * bandPct;
    for (const row of apiData.predicted) {
      result.push({
        date: formatDate(row.date),
        actual: null,
        predicted: row.price,
        bandBase: row.price - band,
        bandWidth: band * 2,
      });
    }

    return { merged: result, formattedToday: fToday };
  }, [apiData]);

  const signal = apiData?.signal ?? "HOLD";
  const sigStyle = SIGNAL_STYLE[signal] ?? SIGNAL_STYLE.HOLD;
  const confidence = Math.round((apiData?.confidence ?? 0) * 100);
  const accuracy = apiData?.accuracy;
  const accuracyText = accuracy == null ? "Not enough data" : `${accuracy.toFixed(1)}%`;
  const chartHeight = typeof window !== "undefined" && window.innerWidth < 640 ? 250 : 320;

  if (loading) {
    return (
      <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="text-xs sm:text-sm text-slate-400 font-semibold animate-pulse">
          Loading prediction from backend...
        </div>
      </div>
    );
  }

  if (error || !apiData) {
    return (
      <div className="bg-[#0b1220] border border-rose-500/30 rounded-2xl p-5 sm:p-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-rose-300">
          Prediction Feed Error
        </h3>
        <p className="text-xs sm:text-sm text-rose-100/90 mt-2">
          Unable to fetch backend prediction for {asset.displayName}. {error ?? ""}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5 relative z-10">
        <div>
          <span className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-widest">
            Neural Forecast Overlay
          </span>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              {apiData.model}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-slate-600">
              version {apiData.model_version ?? "legacy"}
            </span>
          </div>
        </div>
        <button
          onClick={() => document.getElementById("performance-audit")?.scrollIntoView({ behavior: "smooth" })}
          className="self-start px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 hover:text-slate-100 transition-all active:scale-95"
        >
          Audit Log
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 sm:p-4 mb-5 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
              {apiData.prediction_target_label}
            </div>
            <div className="text-sm sm:text-base font-black text-emerald-300 tabular-nums mt-1">
              {formatCurrency(apiData.prediction_value, "USD")}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              {apiData.prediction_target_display}
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2 sm:justify-end">
              {apiData.current_price_label}
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-600 text-slate-400 cursor-help"
                title="Live price is from TradingView widget. Prediction target is backend forecast from Twelve Data candles."
              >
                i
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">{apiData.current_price_source}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5 relative z-10">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Accuracy:</span>
          <span className="text-xs font-black text-indigo-400">{accuracyText}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${sigStyle.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sigStyle.dot}`} />
          <span className={`text-xs font-black uppercase tracking-tight ${sigStyle.text}`}>{signal}</span>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Confidence:</span>
          <span className="text-xs font-black text-slate-200 tabular-nums">{confidence}%</span>
        </div>
      </div>

      <div className="relative z-10" style={{ height: chartHeight }}>
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={merged} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="confBandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
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
                width={58}
                tickFormatter={(v: number) => {
                  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
                  return `$${v.toFixed(2)}`;
                }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
              />

              <Area
                type="monotone"
                dataKey="bandBase"
                stackId="band"
                stroke="none"
                fill="transparent"
                dot={false}
                legendType="none"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="bandWidth"
                stackId="band"
                stroke="rgba(34,197,94,0.2)"
                strokeWidth={1}
                strokeDasharray="3 3"
                fill="url(#confBandGrad)"
                dot={false}
                legendType="none"
                isAnimationActive={false}
              />

              <Line
                type="monotone"
                dataKey="actual"
                stroke="#60a5fa"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive
                animationDuration={900}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#34d399"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={false}
                connectNulls={false}
                isAnimationActive
                animationDuration={900}
              />

              {formattedToday && (
                <ReferenceLine
                  x={formattedToday}
                  stroke="rgba(255,255,255,0.2)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Current candle",
                    fill: "#94a3b8",
                    fontSize: 10,
                    fontWeight: 700,
                    position: "insideTopRight",
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
