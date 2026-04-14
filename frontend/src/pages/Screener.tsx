import React, { useState, useMemo, useCallback } from "react";
import MarketTable from "../components/markets/MarketTable";
import MarketFilters, { type FilterState } from "../components/markets/MarketFilters";
import { marketsData } from "../data/marketsData";
import { MarketItem } from "../types/market";

const INITIAL_FILTERS: FilterState = {
  search: "",
  sector: "",
  marketCapMin: "",
  priceMin: "",
  priceMax: "",
  volumeMin: "",
  signalFilter: "",
};

type SortKey = keyof Pick<MarketItem, "price" | "changePercent" | "volume" | "marketCap" | "rsi">;

function sortItems(items: MarketItem[], key: string, dir: "asc" | "desc"): MarketItem[] {
  const k = key as SortKey;
  return [...items].sort((a, b) => {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    return dir === "asc" ? va - vb : vb - va;
  });
}

export default function Screener() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [sortKey, setSortKey] = useState<string>("rsi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleFilterChange = useCallback((next: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const handleSort = useCallback((key: string) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }, [sortKey]);

  const availableSectors = useMemo(() => 
    [...new Set(marketsData.map((d) => d.sector))].sort() as string[], 
  []);

  const filteredItems = useMemo(() => {
    let result = marketsData;

    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(
        (d) =>
          d.symbol.toLowerCase().includes(q) ||
          d.company.toLowerCase().includes(q)
      );
    }

    if (filters.sector) {
      result = result.filter((d) => d.sector === filters.sector);
    }

    if (filters.signalFilter) {
      result = result.filter((d) => d.aiSignal === filters.signalFilter);
    }

    if (filters.priceMin) {
      const min = parseFloat(filters.priceMin);
      if (!isNaN(min)) result = result.filter((d) => d.price >= min);
    }
    if (filters.priceMax) {
      const max = parseFloat(filters.priceMax);
      if (!isNaN(max)) result = result.filter((d) => d.price <= max);
    }

    if (filters.volumeMin) {
      const minVol = parseInt(filters.volumeMin, 10);
      if (!isNaN(minVol)) result = result.filter((d) => d.volume >= minVol);
    }

    if (filters.marketCapMin) {
      const minCap = parseInt(filters.marketCapMin, 10);
      if (!isNaN(minCap)) result = result.filter((d) => d.marketCap >= minCap);
    }

    return sortItems(result, sortKey, sortDir);
  }, [filters, sortKey, sortDir]);

  // Pro Screener Insights
  const oversold = marketsData.filter(d => d.rsi < 30).length;
  const overbought = marketsData.filter(d => d.rsi > 70).length;

  return (
    <div className="space-y-5 sm:space-y-8 pb-12 sm:pb-16">
      <header>
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-800 pb-4 sm:pb-6 gap-4 sm:gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Advanced Screener</h1>
            <p className="text-slate-400 text-sm max-w-md italic">
              "Find pure momentum. Scan across Stocks, FX, and Crypto for the highest probability AI signals."
            </p>
          </div>

          <div className="flex gap-3 sm:gap-4">
             <div className="bg-slate-900/80 border border-slate-800 p-2.5 sm:p-3 rounded-xl flex-1 sm:flex-none sm:min-w-[120px]">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Oversold (Buy)</p>
                <p className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums">{oversold}</p>
             </div>
             <div className="bg-slate-900/80 border border-slate-800 p-2.5 sm:p-3 rounded-xl flex-1 sm:flex-none sm:min-w-[120px]">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Overbought (Sell)</p>
                <p className="text-lg sm:text-xl font-black text-rose-400 tabular-nums">{overbought}</p>
             </div>
          </div>
        </div>
      </header>

      {/* Control Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
        <div className="xl:col-span-3">
            <div className="bg-slate-800/20 border border-slate-700/30 rounded-xl sm:rounded-3xl p-3 sm:p-6 backdrop-blur-md">
                <MarketFilters
                    filters={filters}
                    onChange={handleFilterChange}
                    sectors={availableSectors}
                    activeCategory="Stocks"
                    totalCount={marketsData.length}
                    filteredCount={filteredItems.length}
                />
            </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-xl sm:rounded-3xl p-4 sm:p-6 hidden xl:block">
            <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-4">Screener Pro Tips</h3>
            <ul className="space-y-3 text-[11px] text-slate-400 leading-relaxed">
                <li className="flex gap-2"><span className="text-indigo-400">●</span> Look for RSI under 30 with Strong Buy signals for reversals.</li>
                <li className="flex gap-2"><span className="text-indigo-400">●</span> Filter by High Volume to find institutional momentum.</li>
                <li className="flex gap-2"><span className="text-indigo-400">●</span> Combine Sector filters with AI signals to find industry leads.</li>
            </ul>
        </div>
      </div>

      <div className="relative">
         <div className="flex items-center gap-4 text-[10px] text-slate-500 mb-2 sm:mb-0
                         sm:absolute sm:-top-4 sm:right-2 sm:bg-slate-950 sm:px-2 sm:py-1">
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Oversold</div>
            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Overbought</div>
         </div>
         <MarketTable
            items={filteredItems}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
         />
      </div>
    </div>
  );
}
