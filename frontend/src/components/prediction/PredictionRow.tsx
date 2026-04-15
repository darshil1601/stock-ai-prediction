import React, { memo } from "react";
import { useNavigate } from "react-router-dom";

import { formatCurrency } from "../../lib/utils";
import type { PredictionTableItem } from "../../types/prediction";

interface Props {
  item: PredictionTableItem;
  rank: number;
}

const SIGNAL_CFG = {
  BUY: {
    dot: "bg-emerald-400",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  SELL: {
    dot: "bg-rose-400",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
  HOLD: {
    dot: "bg-amber-400",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
} as const;

const RISK_CFG = {
  Low: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  Medium: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  High: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
} as const;

function confidenceBarColor(value: number) {
  if (value >= 75) return "bg-emerald-500";
  if (value >= 55) return "bg-amber-500";
  return "bg-rose-500";
}

function PredictionRow({ item, rank }: Props) {
  const navigate = useNavigate();
  const signalCfg = SIGNAL_CFG[item.signal];
  const riskCfg = RISK_CFG[item.riskLevel];
  const accuracyText =
    item.accuracy == null ? "Not enough data" : `${item.accuracy.toFixed(1)}%`;

  return (
    <tr
      onClick={() => navigate(`/stock/${item.routeSymbol}`)}
      className="group border-b border-[rgba(255,255,255,0.04)] last:border-0 hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors duration-150"
    >
      <td className="pl-3 sm:pl-5 py-3 sm:py-4 w-8 sm:w-10">
        <span className="text-[10px] sm:text-xs text-slate-600 tabular-nums font-medium">
          {rank}
        </span>
      </td>

      <td className="py-3 sm:py-4 pr-2 sm:pr-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 text-[9px] sm:text-[10px] font-bold text-indigo-300 tracking-wide">
            {item.symbol.slice(0, 3)}
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-white transition-colors leading-none">
              {item.market}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
              {item.name}
            </div>
          </div>
        </div>
      </td>

      <td className="py-3 sm:py-4 pr-2 sm:pr-4">
        <span
          className={`inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full border ${signalCfg.bg} ${signalCfg.text} ${signalCfg.border}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${signalCfg.dot}`} />
          {item.signal}
        </span>
      </td>

      <td className="py-3 sm:py-4 pr-3 sm:pr-6">
        <div className="flex flex-col">
          <span className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
            {formatCurrency(item.predictionValue, "USD")}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
            {item.predictionTargetLabel}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-600 mt-0.5">
            {item.predictionTargetDisplay}
          </span>
        </div>
      </td>

      <td className="py-3 sm:py-4 pr-2 sm:pr-4 hidden lg:table-cell">
        <div className="flex flex-col gap-2 min-w-[120px]">
          <div className="flex items-center gap-2">
            <div className="w-20 sm:w-24 h-1.5 rounded-full bg-white/5 overflow-hidden flex-shrink-0">
              <div
                className={`h-full rounded-full transition-all duration-500 ${confidenceBarColor(item.confidencePct)}`}
                style={{ width: `${item.confidencePct}%` }}
              />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums">
              {item.confidencePct}%
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-600">{accuracyText}</span>
        </div>
      </td>

      <td className="py-3 sm:py-4 pr-3 sm:pr-5">
        <span
          className={`inline-flex items-center text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full border ${riskCfg.bg} ${riskCfg.text} ${riskCfg.border}`}
        >
          {item.riskLevel}
        </span>
      </td>

      <td className="py-3 sm:py-4 pr-3 sm:pr-5 hidden xl:table-cell">
        <div className="flex flex-col">
          <span className="text-xs sm:text-sm font-semibold text-slate-100">
            {item.modelVersion ?? "legacy"}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-600">
            {item.predictionDataSource}
          </span>
        </div>
      </td>

      <td className="py-3 sm:py-4 pr-3 sm:pr-5 w-6">
        <svg
          className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-150"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </td>
    </tr>
  );
}

export default memo(PredictionRow);
