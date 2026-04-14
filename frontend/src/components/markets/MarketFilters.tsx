import React, { memo } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface FilterState {
  search: string;
  sector: string;
  marketCapMin: string;
  priceMin: string;
  priceMax: string;
  volumeMin: string;
  signalFilter: string;
}

interface MarketFiltersProps {
  filters: FilterState;
  onChange: (next: Partial<FilterState>) => void;
  sectors: string[];
  activeCategory: string;
  totalCount: number;
  filteredCount: number;
}

// ── Reusable styled select ────────────────────────────────────────────────────
const Select = ({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) => (
  <select
    id={id}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="
      h-9 w-full sm:w-auto px-3 pr-8 rounded-lg text-sm text-slate-300
      bg-slate-800/80 border border-slate-700/60
      hover:border-slate-600/80 focus:border-emerald-500/60
      focus:outline-none focus:ring-1 focus:ring-emerald-500/30
      transition-colors duration-150 cursor-pointer appearance-none
      bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
      bg-[length:1.25rem] bg-no-repeat bg-[right_0.4rem_center]
    "
  >
    {children}
  </select>
);

// ── Main Filters Component ────────────────────────────────────────────────────
const MarketFilters = memo(function MarketFilters({
  filters,
  onChange,
  sectors,
  activeCategory,
  totalCount,
  filteredCount,
}: MarketFiltersProps) {
  const showMarketCap =
    activeCategory === "Stocks" || activeCategory === "Crypto";
  const showVolume = activeCategory !== "Indices";

  return (
    <div className="space-y-3">
      {/* ── Top row: Search + Quick signal chips ─────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z"
              />
            </svg>
          </span>
          <input
            id="market-search"
            type="text"
            placeholder="Search symbol or company…"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="
              w-full h-9 pl-9 pr-4 rounded-lg text-sm text-slate-200
              bg-slate-800/80 border border-slate-700/60 placeholder-slate-500
              hover:border-slate-600/80 focus:border-emerald-500/60
              focus:outline-none focus:ring-1 focus:ring-emerald-500/30
              transition-colors duration-150
            "
          />
        </div>

        {/* AI Signal quick-filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {(
            [
              { label: "All Signals",  value: "",            activeClass: "bg-slate-700 border-slate-500 text-slate-100" },
              { label: "Strong Buy",   value: "Strong Buy",  activeClass: "bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20 shadow-md" },
              { label: "Buy",          value: "Buy",         activeClass: "bg-teal-600 border-teal-500 text-white" },
              { label: "Neutral",      value: "Neutral",     activeClass: "bg-slate-600 border-slate-500 text-white" },
              { label: "Sell",         value: "Sell",        activeClass: "bg-rose-600 border-rose-500 text-white" },
              { label: "Strong Sell",  value: "Strong Sell", activeClass: "bg-red-700 border-red-600 text-white shadow-red-700/20 shadow-md" },
            ] as const
          ).map(({ label, value, activeClass }) => {
            const active = filters.signalFilter === value;
            return (
              <button
                key={label}
                id={`signal-chip-${label.replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => onChange({ signalFilter: value })}
                className={`
                  px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex-shrink-0
                  transition-all duration-150 whitespace-nowrap
                  ${
                    active
                      ? `${activeClass} scale-[1.03]`
                      : "border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800/60"
                  }
                `}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <p className="text-xs text-slate-500 tabular-nums whitespace-nowrap sm:ml-auto">
          Showing{" "}
          <span className="text-slate-300 font-medium">{filteredCount}</span>{" "}
          of {totalCount}
        </p>
      </div>

      {/* ── Bottom row: Dropdown filters ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2">
        {/* Sector */}
        {sectors.length > 0 && (
          <Select
            id="filter-sector"
            value={filters.sector}
            onChange={(v) => onChange({ sector: v })}
          >
            <option value="">All Sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        )}

        {/* Price range */}
        <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
          <input
            id="filter-price-min"
            type="number"
            placeholder="Price min"
            value={filters.priceMin}
            onChange={(e) => onChange({ priceMin: e.target.value })}
            className="
              h-9 w-full sm:w-28 px-3 rounded-lg text-sm text-slate-300
              bg-slate-800/80 border border-slate-700/60
              placeholder-slate-600
              hover:border-slate-600/80 focus:border-emerald-500/60
              focus:outline-none focus:ring-1 focus:ring-emerald-500/30
              transition-colors duration-150
            "
          />
          <span className="text-slate-600 text-xs flex-shrink-0">–</span>
          <input
            id="filter-price-max"
            type="number"
            placeholder="Price max"
            value={filters.priceMax}
            onChange={(e) => onChange({ priceMax: e.target.value })}
            className="
              h-9 w-full sm:w-28 px-3 rounded-lg text-sm text-slate-300
              bg-slate-800/80 border border-slate-700/60
              placeholder-slate-600
              hover:border-slate-600/80 focus:border-emerald-500/60
              focus:outline-none focus:ring-1 focus:ring-emerald-500/30
              transition-colors duration-150
            "
          />
        </div>

        {/* Volume floor */}
        {showVolume && (
          <Select
            id="filter-volume"
            value={filters.volumeMin}
            onChange={(v) => onChange({ volumeMin: v })}
          >
            <option value="">Any Volume</option>
            <option value="100000">100K+</option>
            <option value="1000000">1M+</option>
            <option value="5000000">5M+</option>
            <option value="10000000">10M+</option>
          </Select>
        )}

        {/* Market Cap floor */}
        {showMarketCap && (
          <Select
            id="filter-marketcap"
            value={filters.marketCapMin}
            onChange={(v) => onChange({ marketCapMin: v })}
          >
            <option value="">Any Market Cap</option>
            <option value="100000">₹1L Cr+</option>
            <option value="300000">₹3L Cr+</option>
            <option value="500000">₹5L Cr+</option>
          </Select>
        )}

        {/* Clear all */}
        {(filters.search ||
          filters.sector ||
          filters.priceMin ||
          filters.priceMax ||
          filters.volumeMin ||
          filters.marketCapMin ||
          filters.signalFilter) && (
          <button
            id="filters-clear-all"
            onClick={() =>
              onChange({
                search: "",
                sector: "",
                priceMin: "",
                priceMax: "",
                volumeMin: "",
                marketCapMin: "",
                signalFilter: "",
              })
            }
            className="
              h-9 px-3 rounded-lg text-xs font-medium col-span-2 sm:col-span-1
              text-rose-400 border border-rose-500/30
              hover:bg-rose-500/10 hover:border-rose-500/50
              transition-all duration-150
            "
          >
            ✕ Clear Filters
          </button>
        )}
      </div>
    </div>
  );
});

export default MarketFilters;
