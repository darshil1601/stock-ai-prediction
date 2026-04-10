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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
                    bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]
                    rounded-2xl px-6 py-4">

      {/* Symbol & Name */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30
                        flex items-center justify-center font-bold text-indigo-300 text-xs tracking-wider flex-shrink-0">
          {sym.slice(0, 3)}
        </div>
        <div>
          <div className="text-xl font-bold text-slate-100 tracking-wide leading-none">{sym}</div>
          <div className="text-xs text-slate-500 mt-1">{stock?.name ?? "—"} · {categoryLabel}</div>
        </div>
      </div>

      {/* Price + Change */}
      <div className="flex items-end gap-3">
        <div className="text-3xl font-bold text-slate-100 tabular-nums leading-none">
          {price != null ? formatCurrency(price) : "—"}
        </div>
        {changePct != null && (
          <div className={`flex items-center gap-1 mb-0.5 text-sm font-semibold px-2.5 py-1 rounded-lg ${
            isUp
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/15    text-rose-400    border border-rose-500/20"
          }`}>
            <span>{isUp ? "▲" : "▼"}</span>
            <span>{Math.abs(changePct).toFixed(2)}%</span>
          </div>
        )}
      </div>

      {/* Status Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2.5 py-1 rounded-full
                         border border-[rgba(255,255,255,0.07)]
                         bg-[rgba(255,255,255,0.03)] text-slate-400">
          Last update: {timeStr}
        </span>
        <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full
                         bg-emerald-600/10 border border-emerald-500/20 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full
                         bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
          AI Active
        </span>
      </div>
    </div>
  );
}
