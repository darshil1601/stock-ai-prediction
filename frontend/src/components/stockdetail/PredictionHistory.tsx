import React, { useEffect, useState } from "react";
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
}

interface Props {
  symbol?: string;
}

export default function PredictionHistory({ symbol = "gold" }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMsg, setReconcileMsg] = useState<string | null>(null);

  const fetchHistory = () => {
    api.getHistory(symbol, 25)
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
    api.reconcileHistory()
      .then((data) => {
        setReconcileMsg(data.message ?? "Done.");
        setReconciling(false);
        setTimeout(fetchHistory, 1500);
      })
      .catch((e) => {
        setReconcileMsg("Reconcile failed — check backend logs.");
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

  if (loading) return (
    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-10 sm:p-16 flex flex-col items-center justify-center gap-5 shadow-2xl">
      <div className="w-12 h-12 border-2 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin shadow-[0_0_15px_rgba(99,102,241,0.2)]" />
      <div className="text-slate-500 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] animate-pulse">Initializing Global Audit...</div>
    </div>
  );

  if (!history.length) return null;

  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden group">
      {/* Background Decor */}
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
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black tracking-tighter shadow-sm">CORE</span>
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-tight">Post-Market Reconciliation Engine</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest whitespace-nowrap">
              {reconciling ? "Syncing" : "Refresh"}
            </span>
          </button>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <span className="text-[10px] font-black text-slate-100 uppercase tracking-tight">Verified Sync</span>
            </div>
          </div>
        </div>
      </div>

      {reconcileMsg && (
        <div className="mb-6 px-4 py-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 text-[11px] text-indigo-300 font-black uppercase tracking-widest flex items-center gap-3 relative z-10 shadow-lg animate-fade">
          <span className="text-base">🔔</span>
          {reconcileMsg}
        </div>
      )}

      <div className="overflow-x-auto scrollbar-none relative z-10 -mx-1 px-1">
        <table className="w-full text-left border-separate border-spacing-y-3">
          <thead>
            <tr className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
              <th className="pb-2 px-4 whitespace-nowrap">Target Date</th>
              <th className="pb-2 px-4 whitespace-nowrap">AI Forecast</th>
              <th className="pb-2 px-4 whitespace-nowrap">Market Close</th>
              <th className="pb-2 px-4 hidden sm:table-cell">Edge</th>
              <th className="pb-2 px-4 text-right">Result</th>
            </tr>
          </thead>
          <tbody>
            {(history || [])
              .filter((item, index, self) => index === self.findIndex(t => t.predicted_for === item.predicted_for))
              .map((item) => {
                const hasActual = item.actual_price != null;
                const diffVal = hasActual ? Math.abs(item.predicted_price - item.actual_price!) : null;
                const diffPct = hasActual ? (diffVal! / item.actual_price!) * 100 : null;
                
                let accuracyLabel = "⚠ MISSED";
                let accuracyColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                
                if (diffPct != null) {
                    if (diffPct < 0.2) {
                        accuracyLabel = "★ PERFECT";
                        accuracyColor = "bg-emerald-500/20 text-emerald-400 border-emerald-400/30";
                    } else if (diffPct < 0.8) {
                        accuracyLabel = "✔ SUCCESS";
                        accuracyColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                    } else if (diffPct < 1.5) {
                        accuracyLabel = "◌ TRACE";
                        accuracyColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                    }
                }

              return (
                <tr key={item.id} className="group bg-slate-900/40 hover:bg-slate-800/60 transition-all duration-300 shadow-sm">
                  <td className="py-4 px-4 rounded-l-2xl text-slate-500 font-black tabular-nums text-[10px] sm:text-[11px] border-y border-l border-slate-800/50">
                    <span className="opacity-30 mr-1 italic">#</span>
                    {item.predicted_for ? new Date(item.predicted_for).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' }) : "—"}
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
                                <span className={`text-[9px] font-black uppercase tracking-tighter ${diffPct < 1.5 ? 'text-emerald-500/60' : 'text-slate-600'}`}>
                                    Δ {diffPct.toFixed(2)}% Off
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-500/60 text-[9px] font-black uppercase tracking-widest bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/10 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            Active
                        </span>
                    )}
                  </td>
                  <td className="py-4 px-4 border-y border-slate-800/50 hidden sm:table-cell">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest border uppercase transition-colors ${
                      item.signal === "BUY" 
                        ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/10" 
                        : item.signal === "SELL"
                        ? "bg-rose-500/5 text-rose-400 border-rose-500/20 group-hover:bg-rose-500/10"
                        : "bg-slate-700/10 text-slate-500 border-slate-800"
                    }`}>
                      {item.signal}
                    </span>
                  </td>
                  <td className="py-4 px-4 rounded-r-2xl text-right border-y border-r border-slate-800/50">
                    {hasActual ? (
                        <span className={`text-[9px] sm:text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all duration-500 group-hover:scale-105 inline-block shadow-sm ${accuracyColor}`}>
                            {accuracyLabel}
                        </span>
                    ) : (
                        <span className="text-slate-700 text-[9px] uppercase font-black tracking-widest opacity-50 px-3">Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800/60 gap-4 relative z-10 shadow-inner">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/5 flex items-center justify-center border border-indigo-500/10 shadow-lg group-hover:rotate-12 transition-transform duration-500">
                <svg className="w-5 h-5 text-indigo-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed max-w-sm font-bold uppercase tracking-tight">
              Audit Stream <span className="text-indigo-400 underline underline-offset-4 decoration-indigo-500/30">Verified v1.4</span> · High Fidelity Reconciliation active across all global exchanges.
            </p>
          </div>
          <div className="flex items-center gap-3 sm:border-l border-slate-800 sm:pl-5">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">Node ID: 11598-Verified</span>
          </div>
      </div>
    </div>
  );
}
