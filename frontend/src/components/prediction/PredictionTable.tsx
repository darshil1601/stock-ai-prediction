import React from "react";

import type { PredictionTableItem } from "../../types/prediction";
import PredictionRow from "./PredictionRow";

interface Props {
  items: PredictionTableItem[];
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={8} className="py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-slate-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">No backend predictions are available right now.</p>
          <p className="text-xs text-slate-600">Check the API or retrain pipeline status.</p>
        </div>
      </td>
    </tr>
  );
}

function ColHeader({ label, className = "" }: { label: string; className?: string }) {
  return (
    <th
      className={`py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 ${className}`}
    >
      {label}
    </th>
  );
}

export default function PredictionTable({ items }: Props) {
  return (
    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl sm:rounded-2xl overflow-hidden">
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0b1220] border-b border-[rgba(255,255,255,0.05)]">
            <tr>
              <th className="pl-3 sm:pl-5 py-3 w-8 sm:w-10" />
              <ColHeader label="Asset" className="pr-2 sm:pr-4" />
              <ColHeader label="Signal" className="pr-2 sm:pr-4" />
              <ColHeader label="Predicted Target" className="pr-3 sm:pr-6" />
              <ColHeader label="Confidence" className="pr-2 sm:pr-4 hidden lg:table-cell" />
              <ColHeader label="Risk" className="pr-3 sm:pr-5" />
              <ColHeader label="Model" className="pr-3 sm:pr-5 hidden xl:table-cell" />
              <th className="pr-3 sm:pr-5 w-6" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              items.map((item, idx) => (
                <PredictionRow key={item.symbol} item={item} rank={idx + 1} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {items.length > 0 && (
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-t border-[rgba(255,255,255,0.04)] flex items-center justify-between gap-2">
          <span className="text-[10px] sm:text-xs text-slate-600">
            Backend predictions only. Live market prices stay in TradingView widgets.
          </span>
          <span className="text-[10px] sm:text-xs text-slate-600 tabular-nums flex-shrink-0">
            {items.length} asset{items.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
