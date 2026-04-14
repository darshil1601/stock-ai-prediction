import React from "react";
import type { PredictionItem } from "../../data/predictionData";
import PredictionRow from "./PredictionRow";

type SortKey = "probability" | "risk" | null;
type SortDir = "asc" | "desc";

interface Props {
  items:    PredictionItem[];
  sortKey:  SortKey;
  sortDir:  SortDir;
  onSort:   (key: "probability" | "risk") => void;
}

// ─── Column header with optional sort control ──────────────────────────────────
function ColHeader({
  label,
  sortable,
  active,
  dir,
  onClick,
  className = "",
}: {
  label:     string;
  sortable?: boolean;
  active?:   boolean;
  dir?:      SortDir;
  onClick?:  () => void;
  className?: string;
}) {
  return (
    <th
      className={`py-3 text-left text-[10px] font-bold uppercase tracking-widest
                  text-slate-500 select-none ${sortable ? "cursor-pointer group/col" : ""}
                  ${className}`}
      onClick={sortable ? onClick : undefined}
    >
      <span className={`flex items-center gap-1.5 transition-colors duration-150
                        ${sortable ? "hover:text-slate-300" : ""}
                        ${active   ? "text-indigo-400"     : ""}`}>
        {label}
        {sortable && (
          <svg
            className={`w-3 h-3 transition-transform duration-200
                        ${active && dir === "asc" ? "rotate-180" : ""}
                        ${active ? "text-indigo-400" : "text-slate-600"}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
      </span>
    </th>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <tr>
      <td colSpan={7} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">No predictions match the selected filters.</p>
          <p className="text-xs text-slate-600">Try a different timeframe or industry.</p>
        </div>
      </td>
    </tr>
  );
}

// ─── Main table ────────────────────────────────────────────────────────────────
export default function PredictionTable({ items, sortKey, sortDir, onSort }: Props) {
  return (
    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]
                    rounded-xl sm:rounded-2xl overflow-hidden">

      {/* Scrollable wrapper so sticky header actually sticks */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full min-w-[520px] border-collapse">

          {/* ── Sticky header ── */}
          <thead className="sticky top-0 z-10 bg-[#0b1220]
                            border-b border-[rgba(255,255,255,0.05)]">
            <tr>
              <th className="pl-3 sm:pl-5 py-3 w-8 sm:w-10" />

              <ColHeader label="Stock"       className="pl-0 pr-2 sm:pr-4" />

              <ColHeader label="Trend"       className="pr-2 sm:pr-4" />

              <ColHeader
                label="Probability"
                sortable
                active={sortKey === "probability"}
                dir={sortDir}
                onClick={() => onSort("probability")}
                className="pr-3 sm:pr-6"
              />

              <ColHeader label="Target"      className="pr-2 sm:pr-4 hidden sm:table-cell" />

              <ColHeader
                label="Risk"
                sortable
                active={sortKey === "risk"}
                dir={sortDir}
                onClick={() => onSort("risk")}
                className="pr-3 sm:pr-5"
              />

              <th className="pr-3 sm:pr-5 w-6" />
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              items.map((item, idx) => (
                <PredictionRow key={`${item.symbol}-${item.timeframe}`} item={item} rank={idx + 1} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {items.length > 0 && (
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-t border-[rgba(255,255,255,0.04)]
                        flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-xs text-slate-600">
            Powered by{" "}
            <span className="text-indigo-400 font-semibold">MomentumNet v2</span>
            {" "}· Single-model architecture
          </span>
          <span className="text-[10px] sm:text-xs text-slate-600 tabular-nums flex-shrink-0">
            {items.length} result{items.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
