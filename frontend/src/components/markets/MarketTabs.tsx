import React, { memo } from "react";
import type { MarketCategory } from "../../types/market";

const TABS: MarketCategory[] = [
  "Stocks",
  "Indices",
  "Commodities",
  "Forex",
  "Crypto",
];

// ── Icon map ──────────────────────────────────────────────────────────────────
const TAB_ICONS: Record<MarketCategory, string> = {
  Stocks: "📈",
  Indices: "🏛",
  Commodities: "🏅",
  Forex: "💱",
  Crypto: "🪙",
};

interface MarketTabsProps {
  selected: MarketCategory;
  onChange: (tab: MarketCategory) => void;
  counts: Record<MarketCategory, number>;
}

const MarketTabs = memo(function MarketTabs({
  selected,
  onChange,
  counts,
}: MarketTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Market category tabs"
      className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/70 border border-slate-700/50
                 w-full sm:w-fit overflow-x-auto scrollbar-none"
    >
      {TABS.map((tab) => {
        const active = tab === selected;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={active}
            id={`market-tab-${tab.toLowerCase()}`}
            onClick={() => onChange(tab)}
            className={`
              relative flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 rounded-lg
              text-xs sm:text-sm font-medium whitespace-nowrap flex-shrink-0
              transition-all duration-200 outline-none focus-visible:ring-2
              focus-visible:ring-emerald-500/50
              ${
                active
                  ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
              }
            `}
          >
            <span className="text-sm sm:text-base leading-none">{TAB_ICONS[tab]}</span>
            <span>{tab}</span>
            {/* Count badge */}
            <span
              className={`
                ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums
                ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-700/80 text-slate-400"
                }
              `}
            >
              {counts[tab]}
            </span>
          </button>
        );
      })}
    </div>
  );
});

export default MarketTabs;
