import React, { memo } from "react";
import type { MarketItem } from "../../types/market";
import MarketRow from "./MarketRow";

// ── Column header definition ──────────────────────────────────────────────────
interface ColDef {
  key: string;
  label: string;
  align: "left" | "right";
  hidden?: "md" | "lg";
  sortable?: boolean;
}

const COLUMNS: ColDef[] = [
  { key: "symbol",      label: "Symbol / Company",  align: "left"  },
  { key: "price",       label: "Price",             align: "right", sortable: true },
  { key: "change",      label: "Change %",          align: "right", sortable: true },
  { key: "volume",      label: "Volume",            align: "right", sortable: true },
  { key: "marketCap",   label: "Market Cap",        align: "right", sortable: true, hidden: "lg" },
  { key: "rsi",         label: "RSI",               align: "right", sortable: true, hidden: "md" },
  { key: "aiSignal",    label: "AI Signal",         align: "left"  },
  { key: "_arrow",      label: "",                  align: "right" },
];

// ── Sort icon ─────────────────────────────────────────────────────────────────
function SortIcon({ dir }: { dir: "asc" | "desc" | null }) {
  if (!dir) {
    return (
      <span className="opacity-30 text-[10px] leading-none flex flex-col">
        <span>▲</span>
        <span>▼</span>
      </span>
    );
  }
  return (
    <span
      className={`text-[10px] leading-none ${
        dir === "asc" ? "text-emerald-400" : "text-emerald-400"
      }`}
    >
      {dir === "asc" ? "▲" : "▼"}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface MarketTableProps {
  items: MarketItem[];
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
}

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = memo(function EmptyState() {
  return (
    <tr>
      <td colSpan={9} className="py-20">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-4xl opacity-30">🔍</span>
          <p className="text-slate-500 text-sm">
            No results match your filters.
          </p>
          <p className="text-slate-600 text-xs">
            Try clearing some filters to see more data.
          </p>
        </div>
      </td>
    </tr>
  );
});

// ── Table ─────────────────────────────────────────────────────────────────────
const MarketTable = memo(function MarketTable({
  items,
  sortKey,
  sortDir,
  onSort,
}: MarketTableProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">

      {/* ── Gradient top accent stripe ──────────────────────────── */}
      <div className="h-px w-full bg-gradient-to-r from-emerald-500/40 via-teal-500/30 to-transparent" />

      <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
        <table
          role="grid"
          className="w-full text-left border-collapse"
          aria-label="Market data table"
        >
          {/* ── Head (sticky) ───────────────────────────────────── */}
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-700/60 bg-slate-800/95 backdrop-blur-sm">
              {/* Accent spacer */}
              <th className="w-0 p-0" />

              {COLUMNS.map((col) => {
                const isActive = sortKey === col.key;
                const hiddenClass =
                  col.hidden === "lg"
                    ? "hidden lg:table-cell"
                    : col.hidden === "md"
                    ? "hidden md:table-cell"
                    : "";

                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`
                      px-4 py-3
                      text-[11px] font-semibold uppercase tracking-widest
                      text-slate-500 select-none
                      ${col.align === "right" ? "text-right" : "text-left"}
                      ${hiddenClass}
                      ${
                        col.sortable
                          ? "cursor-pointer hover:text-slate-300 transition-colors duration-150"
                          : ""
                      }
                      ${isActive ? "text-emerald-400" : ""}
                    `}
                    onClick={() => col.sortable && onSort(col.key)}
                    aria-sort={
                      isActive
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        <SortIcon dir={isActive ? sortDir : null} />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Body ───────────────────────────────────────────── */}
          <tbody>
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              items.map((item, i) => (
                <MarketRow key={item.symbol} item={item} index={i} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ─────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-800/60 bg-slate-900/50 flex items-center justify-between">
          <p className="text-xs text-slate-600 tabular-nums">
            <span className="text-slate-500 font-medium">{items.length}</span>{" "}
            instrument{items.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Click any
            row to open full analysis
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600/70 font-medium">
            <span className="w-1 h-1 rounded-full bg-emerald-500/60 animate-pulse" />
            AI Signals Active
          </span>
        </div>
      )}
    </div>
  );
});

export default MarketTable;

