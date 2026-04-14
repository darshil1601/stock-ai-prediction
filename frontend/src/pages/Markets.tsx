import React, { useState, useMemo, useCallback } from "react";

import MarketOverviewCards from "../components/home/MarketOverviewCards";
// ── Market-specific components ────────────────────────────────────────────────
import MarketTabs from "../components/markets/MarketTabs";
import MarketFilters from "../components/markets/MarketFilters";
import type { FilterState } from "../components/markets/MarketFilters";
import MarketTable from "../components/markets/MarketTable";

// ── Data & types ──────────────────────────────────────────────────────────────
import { marketsData } from "../data/marketsData";
import type { MarketCategory, MarketItem } from "../types/market";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const ALL_CATEGORIES: MarketCategory[] = [
  "Stocks",
  "Indices",
  "Commodities",
  "Forex",
  "Crypto",
];

const INITIAL_FILTERS: FilterState = {
  search: "",
  sector: "",
  marketCapMin: "",
  priceMin: "",
  priceMax: "",
  volumeMin: "",
  signalFilter: "",
};

type SortKey = keyof Pick<
  MarketItem,
  "price" | "changePercent" | "volume" | "marketCap" | "rsi"
>;

function sortItems(
  items: MarketItem[],
  key: string,
  dir: "asc" | "desc"
): MarketItem[] {
  const k = key as SortKey;
  return [...items].sort((a, b) => {
    const va = a[k] ?? 0;
    const vb = b[k] ?? 0;
    return dir === "asc" ? va - vb : vb - va;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Markets Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Markets() {
  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<MarketCategory>("Stocks");

  // ── Filter state ───────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  const handleFilterChange = useCallback(
    (next: Partial<FilterState>) => {
      setFilters((prev) => ({ ...prev, ...next }));
    },
    []
  );

  // ── Reset filters when tab changes ─────────────────────────────────────────
  const handleTabChange = useCallback((tab: MarketCategory) => {
    setActiveTab(tab);
    setFilters(INITIAL_FILTERS);
  }, []);

  // ── Sort state ─────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<string>("changePercent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = useCallback(
    (key: string) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey]
  );

  // ── Per-tab counts ──────────────────────────────────────────────────────────
  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        ALL_CATEGORIES.map((cat) => [
          cat,
          marketsData.filter((d) => d.category === cat).length,
        ])
      ) as Record<MarketCategory, number>,
    []
  );

  // ── Category slice (static data) ───────────────────────────────────────────
  const categorySlice = useMemo(
    () => marketsData.filter((d) => d.category === activeTab),
    [activeTab]
  );

  // ── Unique sectors for current category ────────────────────────────────────
  const availableSectors = useMemo(
    () =>
      [...new Set(categorySlice.map((d) => d.sector))].sort() as string[],
    [categorySlice]
  );

  // ── Apply all filters ──────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let result = categorySlice;

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
  }, [categorySlice, filters, sortKey, sortDir]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 sm:space-y-8 pb-12 sm:pb-16">

      {/* ══ PAGE HEADER ══════════════════════════════════════════════════════ */}
      <header>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE MARKET DATA
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight leading-snug">
              Markets Dashboard
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-lg">
              Real-time prices, AI-powered signals and risk metrics across
              Stocks, Indices, Commodities, Forex &amp; Crypto.
            </p>
          </div>

          {/* Right meta */}
          <div className="flex items-center gap-3 sm:gap-4 pt-1 flex-wrap">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] text-slate-600 uppercase tracking-widest font-medium">
                Last Updated
              </p>
              <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                {new Date().toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
            <div className="flex flex-row sm:flex-col gap-1.5 sm:gap-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                NSE / BSE Open
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                AI Models Active
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ══ SECTION 1 — MARKET OVERVIEW ════════════════════════════════════ */}
      <section aria-labelledby="market-overview-heading">
        <MarketOverviewCards />
      </section>

      {/* ══ DIVIDER ══════════════════════════════════════════════════════════ */}
      <hr className="border-slate-800/60" />

      {/* ══ SECTION 2 — CATEGORY TABS ════════════════════════════════════════ */}
      <section aria-label="Market category selector">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <MarketTabs
            selected={activeTab}
            onChange={handleTabChange}
            counts={tabCounts}
          />

          {/* Subtle stat row — hidden on mobile for cleaner look */}
          <div className="hidden sm:flex items-center gap-5 text-xs text-slate-600">
            <span>
              <span className="text-slate-400 font-semibold">
                {marketsData.length}
              </span>{" "}
              total instruments
            </span>
            <span className="w-px h-4 bg-slate-800" />
            <span>
              <span className="text-emerald-400 font-semibold">
                {marketsData.filter((d) => d.aiSignal.includes("Buy")).length}
              </span>{" "}
              bullish signals
            </span>
            <span className="w-px h-4 bg-slate-800" />
            <span>
              <span className="text-rose-400 font-semibold">
                {marketsData.filter((d) => d.aiSignal.includes("Sell")).length}
              </span>{" "}
              bearish signals
            </span>
          </div>
        </div>

        {/* ══ SECTION 3 — SEARCH + FILTERS ═══════════════════════════════════ */}
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4">
          <MarketFilters
            filters={filters}
            onChange={handleFilterChange}
            sectors={availableSectors}
            activeCategory={activeTab}
            totalCount={categorySlice.length}
            filteredCount={filteredItems.length}
          />
        </div>

        {/* ══ SECTION 4 — MAIN DATA TABLE ════════════════════════════════════ */}
        <MarketTable
          items={filteredItems}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </section>

    </div>
  );
}
