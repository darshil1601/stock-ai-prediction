import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import type { MarketItem, AISignal } from "../../types/market";

// ── AI Signal Badge ───────────────────────────────────────────────────────────
const SIGNAL_STYLES: Record<AISignal, string> = {
  "Strong Buy":
    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10 shadow-sm",
  Buy: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
  Neutral: "bg-slate-600/40 text-slate-400 border border-slate-600/50",
  Sell: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  "Strong Sell":
    "bg-red-600/20 text-red-400 border border-red-600/40 shadow-red-600/10 shadow-sm",
};

const SIGNAL_DOT: Record<AISignal, string> = {
  "Strong Buy": "bg-emerald-400",
  Buy: "bg-teal-400",
  Neutral: "bg-slate-500",
  Sell: "bg-rose-400",
  "Strong Sell": "bg-red-500",
};

// ── RSI colour ────────────────────────────────────────────────────────────────
function rsiColor(rsi: number): string {
  if (rsi >= 70) return "text-rose-400";
  if (rsi >= 55) return "text-emerald-400";
  if (rsi <= 30) return "text-red-500 font-bold";
  return "text-slate-400";
}

// ── Number formatters ─────────────────────────────────────────────────────────
function fmtPrice(price: number): string {
  if (price >= 10_000) return price.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  if (price >= 1) return price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-IN", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function fmtVolume(vol: number): string {
  if (vol === 0) return "—";
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(2) + "M";
  if (vol >= 1_000) return (vol / 1_000).toFixed(1) + "K";
  return vol.toLocaleString("en-IN");
}

function fmtMarketCap(cap: number, category: string): string {
  if (cap === 0) return "—";
  if (category === "Crypto") return "$" + cap.toLocaleString("en-US") + " Bn";
  if (cap >= 1_00_000) return "₹" + (cap / 1_00_000).toFixed(2) + "L Cr";
  return "₹" + cap.toLocaleString("en-IN") + " Cr";
}

// ── Market Row ────────────────────────────────────────────────────────────────
interface MarketRowProps {
  item: MarketItem;
  index: number;
}

const MarketRow = memo(function MarketRow({ item, index }: MarketRowProps) {
  const navigate = useNavigate();
  const positive = item.changePercent >= 0;

  const handleClick = () => {
    navigate(`/stock/${item.symbol}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <tr
      role="row"
      tabIndex={0}
      aria-label={`${item.company} — ${item.aiSignal}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        group relative
        border-b border-slate-800/60 last:border-0
        cursor-pointer select-none
        transition-all duration-150
        hover:bg-slate-800/60
        focus-visible:outline-none focus-visible:bg-slate-800/60
        ${index % 2 === 0 ? "bg-transparent" : "bg-slate-800/20"}
      `}
    >
      {/* Left accent bar on hover */}
      <td className="relative p-0 w-0">
        <span
          className={`
            absolute left-0 top-0 h-full w-0.5 rounded-full
            opacity-0 group-hover:opacity-100 transition-opacity duration-150
            ${positive ? "bg-emerald-500" : "bg-rose-500"}
          `}
        />
      </td>

      {/* Symbol + Company */}
      <td className="px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold text-slate-100 tracking-wide group-hover:text-emerald-400 transition-colors duration-150">
            {item.symbol}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 truncate max-w-[150px]">
              {item.company}
            </span>
            <span className="hidden sm:inline-flex px-1.5 py-px rounded text-[10px] font-medium bg-slate-700/60 text-slate-500 border border-slate-700/40 whitespace-nowrap shrink-0">
              {item.sector}
            </span>
          </div>
        </div>
      </td>

      {/* Price */}
      <td className="px-4 py-3.5 text-right">
        <span className="text-sm font-semibold text-slate-200 tabular-nums">
          {fmtPrice(item.price)}
        </span>
      </td>

      {/* Change % */}
      <td className="px-4 py-3.5 text-right">
        <span
          className={`
            inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums
            ${positive ? "text-emerald-400" : "text-rose-400"}
          `}
        >
          <span className="text-xs leading-none">{positive ? "▲" : "▼"}</span>
          {Math.abs(item.changePercent).toFixed(2)}%
        </span>
      </td>

      {/* Volume */}
      <td className="px-4 py-3.5 text-right">
        <span className="text-sm text-slate-400 tabular-nums">
          {fmtVolume(item.volume)}
        </span>
      </td>

      {/* Market Cap */}
      <td className="px-4 py-3.5 text-right hidden lg:table-cell">
        <span className="text-sm text-slate-400 tabular-nums">
          {fmtMarketCap(item.marketCap, item.category)}
        </span>
      </td>

      {/* RSI */}
      <td className="px-4 py-3.5 text-right hidden md:table-cell">
        <div className="inline-flex items-center gap-1.5">
          <div className="w-12 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${item.rsi >= 70
                  ? "bg-rose-400"
                  : item.rsi <= 30
                    ? "bg-red-500"
                    : "bg-emerald-500"
                }`}
              style={{ width: `${item.rsi}%` }}
            />
          </div>
          <span className={`text-sm font-medium tabular-nums ${rsiColor(item.rsi)}`}>
            {item.rsi}
          </span>
        </div>
      </td>

      {/* AI Signal */}
      <td className="px-4 py-3.5">
        <span
          className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
            text-xs font-semibold whitespace-nowrap
            ${SIGNAL_STYLES[item.aiSignal]}
          `}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${SIGNAL_DOT[item.aiSignal]} ${item.aiSignal === "Strong Buy" ? "animate-pulse" : ""
              }`}
          />
          {item.aiSignal}
        </span>
      </td>

      {/* Arrow CTA */}
      <td className="px-4 py-3.5 text-right w-10">
        <span className="text-slate-700 group-hover:text-slate-400 transition-colors duration-150 text-lg leading-none">
          →
        </span>
      </td>
    </tr>
  );
});

export default MarketRow;
