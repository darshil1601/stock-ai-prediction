import React from "react";
import { formatCurrency } from "../../lib/utils";
import type { Asset } from "../../types/stock";

interface Props {
  stock: Asset | undefined;
  sym: string;
  livePrice?: number | null;
  liveChangePct?: number | null;
}

export default function TopInfoBar({ stock, sym, livePrice, liveChangePct }: Props) {
  const price     = livePrice     ?? stock?.price  ?? null;
  const changePct = liveChangePct ?? stock?.change ?? null;
  const isUp      = (changePct ?? 0) >= 0;

  const now     = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const categoryLabel =
    stock?.category === "Crypto"    ? "Crypto · Binance"  :
    stock?.category === "Commodity" ? "Commodity · MCX"   :
                                      "Equity · NSE";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6
                    bg-slate-900/50 backdrop-blur-md border border-slate-800
                    rounded-2xl px-5 sm:px-6 py-4 sm:py-5 shadow-xl">

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-600/15 border border-indigo-500/20
                        flex items-center justify-center font-bold text-indigo-300 text-[10px] sm:text-xs tracking-widest flex-shrink-0 shadow-lg">
          {sym.slice(0, 3)}
        </div>
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight leading-none group-hover:text-emerald-400 transition-colors">{sym}</div>
          <div className="text-[10px] sm:text-xs text-slate-500 mt-1 font-semibold uppercase tracking-wider truncate">
            {stock?.name ?? sym} · {categoryLabel}
          </div>
        </div>
      </div>

      <div className="flex items-end gap-3 sm:gap-4">
        <div className="text-3xl sm:text-4xl font-black text-slate-100 tabular-nums leading-none tracking-tighter">
          {price != null ? formatCurrency(price) : "—"}
        </div>
        {changePct != null && (
          <div className={`flex items-center gap-1 mb-1 text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 rounded-lg border shadow-sm ${
            isUp
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10    text-rose-400    border-rose-500/20"
          }`}>
            <span>{isUp ? "▲" : "▼"}</span>
            <span>{Math.abs(changePct).toFixed(2)}%</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap border-t lg:border-t-0 border-slate-800/50 pt-4 lg:pt-0">
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider
                         border border-slate-800 bg-slate-950/50 text-slate-500 shadow-inner">
          Update: {timeStr}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider
                         bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          Live Feed
        </span>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider
                         bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-sm">
          AI Active
        </span>
      </div>
    </div>
  );
}
