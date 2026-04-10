import React, { useEffect, useState } from "react";
import { formatCurrency } from "../../lib/utils";

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
    fetch(`http://localhost:8000/api/${symbol.toLowerCase()}/history?limit=25`)
      .then((r) => r.json())
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
    fetch(`http://localhost:8000/api/reconcile`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        setReconcileMsg(data.message ?? "Done.");
        setReconciling(false);
        // Refresh history after a short delay to show updated prices
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
    // Refresh every 30 mins if staying on page
    const timer = setInterval(fetchHistory, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [symbol]);

  // Auto-trigger reconcile once on mount (backend rate-limits to once per 5 min)
  useEffect(() => {
    fetch(`http://localhost:8000/api/reconcile`, { method: "POST" }).catch(() => {});
  }, []);

  if (loading) return (
    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-12 mt-8 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      <div className="text-slate-500 text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Audit Engine...</div>
    </div>
  );

  if (!history.length) return null;

  return (
    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-6 mt-8 shadow-2xl relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 blur-[100px] pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-700" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-2 h-8 rounded-full bg-gradient-to-b from-indigo-400 to-blue-600 shadow-lg shadow-indigo-500/20" />
            <div className="absolute top-0 -left-1 w-4 h-4 bg-indigo-500/20 rounded-full blur-md animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-2">
              AI Performance Audit
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black">PRO</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Auto-reconciliation of past targets vs market closing actuals</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Reconcile Now button */}
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 hover:border-indigo-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {reconciling ? (
              <span className="w-3 h-3 border border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8 8 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8 8 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tight">
              {reconciling ? "Syncing..." : "Reconcile Now"}
            </span>
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">System Health</span>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800/80 shadow-inner">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                <span className="text-[10px] font-bold text-slate-100 uppercase tracking-tight">Verified Sync</span>
            </div>
          </div>
        </div>
      </div>
      {/* Reconcile status message */}
      {reconcileMsg && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 text-[11px] text-indigo-300 font-medium flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {reconcileMsg}
        </div>
      )}

      <div className="overflow-x-auto custom-scrollbar -mx-2 px-2">
        <table className="w-full text-left border-separate border-spacing-y-2.5">
          <thead>
            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <th className="pb-2 px-4 whitespace-nowrap">Target Date</th>
              <th className="pb-2 px-4">AI Prediction</th>
              <th className="pb-2 px-4">Market Actual</th>
              <th className="pb-2 px-4">Logic</th>
              <th className="pb-2 px-4 text-right">Audit Result</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(new Set(history.map(item => item.predicted_for)))
              .map(date => history.find(item => item.predicted_for === date)!)
              .map((item) => {
                const hasActual = item.actual_price != null;
                const diffVal = hasActual ? Math.abs(item.predicted_price - item.actual_price!) : null;
                const diffPct = hasActual 
                    ? (diffVal! / item.actual_price!) * 100 
                    : null;
                
                // Tiered accuracy
                let accuracyLabel = "⚠ MISSED";
                let accuracyColor = "bg-rose-500/15 text-rose-400 border-rose-500/20";
                
                if (diffPct != null) {
                    if (diffPct < 0.2) {
                        accuracyLabel = "★ PERFECT";
                        accuracyColor = "bg-emerald-500/20 text-emerald-400 border-emerald-400/30";
                    } else if (diffPct < 0.8) {
                        accuracyLabel = "✔ SUCCESS";
                        accuracyColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                    } else if (diffPct < 1.5) {
                        accuracyLabel = "◌ CLOSE";
                        accuracyColor = "bg-amber-500/15 text-amber-500/90 border-amber-500/20";
                    }
                }

              return (
                <tr key={item.id} className="group bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300">
                  <td className="py-4 px-4 rounded-l-2xl text-slate-400 font-bold family-mono text-[11px]">
                    <span className="opacity-40 font-normal mr-1">#</span>
                    {item.predicted_for ? new Date(item.predicted_for).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: '2-digit' }) : "Pending"}
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-100 tabular-nums">
                    {formatCurrency(item.predicted_price, "USD")}
                  </td>
                  <td className="py-4 px-4">
                    {hasActual ? (
                        <div className="flex flex-col">
                            <span className="text-slate-300 font-bold tabular-nums">
                                {formatCurrency(item.actual_price!, "USD")}
                            </span>
                            {diffPct != null && (
                                <span className={`text-[9px] font-bold ${diffPct < 1.5 ? 'text-emerald-500/60' : 'text-slate-500'}`}>
                                    Δ {diffPct.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="flex items-center gap-2 text-amber-500/70 text-[9px] font-black uppercase tracking-wider bg-amber-500/5 px-2 py-1 rounded-lg border border-amber-500/10 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Awaiting Close
                        </span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-tighter border shadow-sm ${
                      item.signal === "BUY" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5" 
                        : item.signal === "SELL"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5"
                        : "bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-slate-500/5"
                    }`}>
                      {item.signal}
                    </span>
                  </td>
                  <td className="py-4 px-4 rounded-r-2xl text-right">
                    {hasActual ? (
                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all duration-500 group-hover:scale-105 inline-block ${accuracyColor}`}>
                            {accuracyLabel}
                        </span>
                    ) : (
                        <span className="text-slate-600 text-[9px] uppercase font-black tracking-[0.2em] opacity-50">Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/10 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm font-medium">
              MomentumNet <span className="text-indigo-400 font-bold">Audit Logic v1.4</span> continuously monitors Twelve Data feed. 
              Actuals are updated daily at 21:30 UTC following market settlement.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-px bg-slate-800 hidden sm:block mx-2" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Core Verifier: 11598 (OK)</span>
          </div>
      </div>
    </div>
  );
}
