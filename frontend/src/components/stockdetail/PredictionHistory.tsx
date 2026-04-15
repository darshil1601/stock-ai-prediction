import React, { useEffect, useMemo, useState } from "react";

import { formatCurrency } from "../../lib/utils";
import { api } from "../../services/api";

interface HistoryItem {
  id: number;
  created_at: string;
  symbol: string;
  predicted_price: number;
  actual_price: number | null;
  confidence: number;
  signal: string;
  predicted_for: string;
  prediction_target_time?: string;
  prediction_target_display?: string;
}

interface Props {
  symbol?: string;
}

const BTC_HOURLY_CUTOVER = "2026-04-15";

function isBtcHourlyRow(item: HistoryItem, isCrypto: boolean): boolean {
  if (!isCrypto) return false;
  const rowDate = (item.predicted_for || "").slice(0, 10);
  return rowDate >= BTC_HOURLY_CUTOVER;
}

function formatTargetLabel(item: HistoryItem, showTime: boolean): string {
  if (item.prediction_target_display) {
    return item.prediction_target_display;
  }

  if (item.prediction_target_time) {
    return new Date(item.prediction_target_time).toLocaleString("en-IN", showTime ? {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    } : {
      day: "2-digit",
      month: "short",
    });
  }

  if (!item.predicted_for) return "-";
  return new Date(item.predicted_for).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export default function PredictionHistory({ symbol = "gold" }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMsg, setReconcileMsg] = useState<string | null>(null);

  const isCrypto = useMemo(() => symbol.toUpperCase().includes("BTC"), [symbol]);
  const targetHeader = isCrypto ? "Target" : "Target Date";
  const actualHeader = isCrypto ? "Target Candle" : "Market Close";

  const fetchHistory = () => {
    api
      .getHistory(symbol, 25)
      .then((data) => {
        setHistory(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Error fetching history:", e);
        setLoading(false);
      });
  };

  const handleReconcile = () => {
    setReconciling(true);
    setReconcileMsg(null);
    api
      .reconcileHistory()
      .then((data) => {
        setReconcileMsg(data.message ?? "Done.");
        setReconciling(false);
        setTimeout(fetchHistory, 1200);
      })
      .catch((e) => {
        setReconcileMsg("Reconcile failed. Check backend logs.");
        setReconciling(false);
        console.error("Reconcile error:", e);
      });
  };

  useEffect(() => {
    fetchHistory();
    const timer = setInterval(fetchHistory, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [symbol]);

  useEffect(() => {
    api.reconcileHistory().catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-10 sm:p-16 flex flex-col items-center justify-center gap-5 shadow-2xl">
        <div className="w-12 h-12 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.2)]" />
        <div className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] animate-pulse">
          Initializing Audit
        </div>
      </div>
    );
  }

  if (!history.length) return null;

  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden group">
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/5 blur-[120px] pointer-events-none group-hover:bg-indigo-500/8 transition-colors duration-1000" />

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-5 relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600 shadow-[0_0_10px_rgba(99,102,241,0.4)]" />
            <div className="absolute top-0 -left-1.5 w-4 h-4 bg-indigo-500/20 rounded-full blur-md animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white tracking-widest uppercase flex items-center gap-2">
              Performance Audit
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black tracking-tighter shadow-sm">
                CORE
              </span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-tight">
              {isCrypto ? "Hourly Reconciliation Engine" : "Post-Market Reconciliation Engine"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {reconciling ? (
              <span className="w-3 h-3 border-2 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest whitespace-nowrap">
              {reconciling ? "Syncing" : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      {reconcileMsg && (
        <div className="mb-6 px-4 py-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 text-[11px] text-indigo-300 font-black uppercase tracking-widest relative z-10 shadow-lg">
          {reconcileMsg}
        </div>
      )}

      {isCrypto && (
        <div className="mb-6 px-4 py-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-[10px] sm:text-[11px] text-amber-300 font-black uppercase tracking-widest relative z-10 shadow-lg">
          BTC hourly mode starts from 15 Apr 2026 UTC. Older audit rows remain daily-close records.
        </div>
      )}

      <div className="overflow-x-auto scrollbar-none relative z-10 -mx-1 px-1">
        <table className="w-full text-left border-separate border-spacing-y-3">
          <thead>
            <tr className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
              <th className="pb-2 px-4 whitespace-nowrap">{targetHeader}</th>
              <th className="pb-2 px-4 whitespace-nowrap">AI Forecast</th>
              <th className="pb-2 px-4 whitespace-nowrap">{actualHeader}</th>
              <th className="pb-2 px-4 hidden sm:table-cell">Edge</th>
              <th className="pb-2 px-4 text-right">Result</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => {
              const rowIsHourly = isBtcHourlyRow(item, isCrypto);
              const hasActual = item.actual_price != null;
              const diffVal = hasActual ? Math.abs(item.predicted_price - item.actual_price!) : null;
              const diffPct = hasActual ? (diffVal! / item.actual_price!) * 100 : null;

              let accuracyLabel = "MISSED";
              let accuracyColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";

              if (diffPct != null) {
                if (diffPct < 0.2) {
                  accuracyLabel = "PERFECT";
                  accuracyColor = "bg-emerald-500/20 text-emerald-400 border-emerald-400/30";
                } else if (diffPct < 0.8) {
                  accuracyLabel = "SUCCESS";
                  accuracyColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                } else if (diffPct < 1.5) {
                  accuracyLabel = "TRACE";
                  accuracyColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                }
              }

              return (
                <tr key={item.id} className="group bg-slate-900/40 hover:bg-slate-800/60 transition-all duration-300 shadow-sm">
                  <td className="py-4 px-4 rounded-l-2xl text-slate-500 font-black tabular-nums text-[10px] sm:text-[11px] border-y border-l border-slate-800/50">
                    <span className="opacity-30 mr-1 italic">#</span>
                    {formatTargetLabel(item, rowIsHourly)}
                  </td>
                  <td className="py-4 px-4 font-black text-slate-100 tabular-nums border-y border-slate-800/50 text-xs sm:text-sm">
                    {formatCurrency(item.predicted_price, "USD")}
                  </td>
                  <td className="py-4 px-4 border-y border-slate-800/50">
                    {hasActual ? (
                      <div className="flex flex-col">
                        <span className="text-slate-300 font-black tabular-nums text-xs sm:text-sm">
                          {formatCurrency(item.actual_price!, "USD")}
                        </span>
                        {diffPct != null && (
                          <span
                            className={`text-[9px] font-black uppercase tracking-tighter ${
                              diffPct < 1.5 ? "text-emerald-500/60" : "text-slate-600"
                            }`}
                          >
                            Delta {diffPct.toFixed(2)}% Off
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-500/60 text-[9px] font-black uppercase tracking-widest bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/10 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                        {rowIsHourly ? "Awaiting Target" : "Awaiting Close"}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 border-y border-slate-800/50 hidden sm:table-cell">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest border uppercase transition-colors ${
                        item.signal === "BUY"
                          ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/10"
                          : item.signal === "SELL"
                          ? "bg-rose-500/5 text-rose-400 border-rose-500/20 group-hover:bg-rose-500/10"
                          : "bg-slate-700/10 text-slate-500 border-slate-800"
                      }`}
                    >
                      {item.signal}
                    </span>
                  </td>
                  <td className="py-4 px-4 rounded-r-2xl text-right border-y border-r border-slate-800/50">
                    {hasActual ? (
                      <span
                        className={`text-[9px] sm:text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all duration-500 group-hover:scale-105 inline-block shadow-sm ${accuracyColor}`}
                      >
                        {accuracyLabel}
                      </span>
                    ) : (
                      <span className="text-slate-700 text-[9px] uppercase font-black tracking-widest opacity-50 px-3">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
