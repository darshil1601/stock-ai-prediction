import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import type { PredictionItem } from "../../data/predictionData";

interface Props {
  item: PredictionItem;
  rank: number;
}

// ─── Badge configs ─────────────────────────────────────────────────────────────
const TREND_CFG = {
  Bullish: { dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  Bearish: { dot: "bg-rose-400",    bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/20"    },
  Neutral: { dot: "bg-slate-400",   bg: "bg-slate-500/10",   text: "text-slate-300",   border: "border-slate-500/20"   },
} as const;

const RISK_CFG = {
  Low:    { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  Medium: { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20"   },
  High:   { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/20"    },
} as const;

// Probability bar color
function barColor(p: number) {
  if (p >= 80) return "bg-emerald-500";
  if (p >= 65) return "bg-amber-500";
  return "bg-rose-500";
}

function PredictionRow({ item, rank }: Props) {
  const navigate  = useNavigate();
  const trendCfg  = TREND_CFG[item.trend];
  const riskCfg   = RISK_CFG[item.risk];

  const handleClick = () => navigate(`/stock/${item.symbol}`);

  const targetFmt = item.target >= 1_000
    ? `₹${item.target.toLocaleString("en-IN")}`
    : `₹${item.target.toFixed(2)}`;

  return (
    <tr
      onClick={handleClick}
      className="group border-b border-[rgba(255,255,255,0.04)] last:border-0
                 hover:bg-[rgba(255,255,255,0.03)] cursor-pointer
                 transition-colors duration-150"
    >
      {/* ── Rank ── */}
      <td className="pl-3 sm:pl-5 py-3 sm:py-4 w-8 sm:w-10">
        <span className="text-[10px] sm:text-xs text-slate-600 tabular-nums font-medium">{rank}</span>
      </td>

      {/* ── Stock ── */}
      <td className="py-3 sm:py-4 pr-2 sm:pr-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-indigo-600/15 border border-indigo-500/20
                          flex items-center justify-center flex-shrink-0
                          text-[9px] sm:text-[10px] font-bold text-indigo-300 tracking-wide">
            {item.symbol.slice(0, 3)}
          </div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-white
                            transition-colors leading-none">{item.symbol}</div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate max-w-[100px] sm:max-w-[180px]">
              {item.company}
            </div>
          </div>
        </div>
      </td>

      {/* ── Trend badge ── */}
      <td className="py-3 sm:py-4 pr-2 sm:pr-4">
        <span className={`inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold
                          px-2 sm:px-2.5 py-1 rounded-full border
                          ${trendCfg.bg} ${trendCfg.text} ${trendCfg.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${trendCfg.dot}`} />
          {item.trend}
        </span>
      </td>

      {/* ── Probability ── */}
      <td className="py-3 sm:py-4 pr-3 sm:pr-6">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-16 sm:w-24 h-1.5 rounded-full bg-white/5 overflow-hidden flex-shrink-0">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(item.probability)}`}
              style={{ width: `${item.probability}%` }}
            />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-100 tabular-nums w-8 sm:w-10">
            {item.probability}%
          </span>
        </div>
      </td>

      {/* ── Target price — hidden on mobile ── */}
      <td className="py-3 sm:py-4 pr-2 sm:pr-4 hidden sm:table-cell">
        <span className="text-sm font-semibold text-slate-100 tabular-nums">
          {targetFmt}
        </span>
      </td>

      {/* ── Risk badge ── */}
      <td className="py-3 sm:py-4 pr-3 sm:pr-5">
        <span className={`inline-flex items-center text-[10px] sm:text-xs font-bold
                          px-2 sm:px-2.5 py-1 rounded-full border
                          ${riskCfg.bg} ${riskCfg.text} ${riskCfg.border}`}>
          {item.risk}
        </span>
      </td>

      {/* ── Arrow (hover) ── */}
      <td className="py-3 sm:py-4 pr-3 sm:pr-5 w-6">
        <svg
          className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-600 group-hover:text-slate-400
                     group-hover:translate-x-0.5 transition-all duration-150"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </td>
    </tr>
  );
}

export default memo(PredictionRow);
