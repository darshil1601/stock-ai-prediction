import React, { useState, useMemo, useCallback } from "react";
import {
  predictionData,
  type PredictionTimeframe,
  type Industry,
  type PredictionItem,
} from "../data/predictionData";
import PredictionFilters from "../components/prediction/PredictionFilters";
import PredictionTable from "../components/prediction/PredictionTable";

type SortKey = "probability" | "risk" | null;
type SortDir = "asc" | "desc";

// ─── Risk ordinal (for sort) ──────────────────────────────────────────────────
const RISK_ORDER: Record<PredictionItem["risk"], number> = {
  Low: 1, Medium: 2, High: 3,
};

export default function Prediction() {
  // ── Filters ──────────────────────────────────────────────────────────────────
  const [activeTimeframe, setActiveTimeframe] = useState<PredictionTimeframe>("1D");
  const [activeIndustry, setActiveIndustry] = useState<Industry>("All Industries");

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>("probability");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback((key: "probability" | "risk") => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        return key;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  // ── Filtered + sorted data ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = predictionData.filter((item) => item.timeframe === activeTimeframe);

    if (activeIndustry !== "All Industries") {
      list = list.filter((item) => item.industry === activeIndustry);
    }

    if (sortKey === "probability") {
      list = [...list].sort((a, b) =>
        sortDir === "desc"
          ? b.probability - a.probability
          : a.probability - b.probability
      );
    } else if (sortKey === "risk") {
      list = [...list].sort((a, b) =>
        sortDir === "desc"
          ? RISK_ORDER[b.risk] - RISK_ORDER[a.risk]
          : RISK_ORDER[a.risk] - RISK_ORDER[b.risk]
      );
    }

    return list;
  }, [activeTimeframe, activeIndustry, sortKey, sortDir]);

  // ── Market summary stats (from the filtered list) ────────────────────────────
  const stats = useMemo(() => {
    const all = predictionData.filter((i) => i.timeframe === activeTimeframe);
    const bull = all.filter((i) => i.trend === "Bullish").length;
    const bear = all.filter((i) => i.trend === "Bearish").length;
    const avgP = all.length
      ? Math.round(all.reduce((s, i) => s + i.probability, 0) / all.length)
      : 0;
    return { bull, bear, total: all.length, avgP };
  }, [activeTimeframe]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-5 pb-8">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-100 leading-none">
            AI Prediction Dashboard
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5">
            Single-model AI analysis across Equities, Commodities &amp; Crypto
          </p>
        </div>

        {/* Model badge (read-only — no selection) */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl
                        bg-indigo-600/10 border border-indigo-500/20 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-semibold text-indigo-300">MomentumNet v2</span>
          <span className="text-xs text-indigo-500/60">· Active</span>
        </div>
      </div>

      {/* ── Summary stat pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Total Signals", value: stats.total, color: "text-slate-100" },
          { label: "Bullish", value: stats.bull, color: "text-emerald-400" },
          { label: "Bearish", value: stats.bear, color: "text-rose-400" },
          { label: "Avg Probability", value: `${stats.avgP}%`, color: "text-indigo-400" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]
                       rounded-xl px-3 sm:px-4 py-2.5 sm:py-3"
          >
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              {label}
            </div>
            <div className={`text-xl sm:text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <PredictionFilters
        activeTimeframe={activeTimeframe}
        activeIndustry={activeIndustry}
        resultCount={filtered.length}
        onTimeframe={setActiveTimeframe}
        onIndustry={setActiveIndustry}
      />

      {/* ── Results table ── */}
      <PredictionTable
        items={filtered}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />
    </div>
  );
}
