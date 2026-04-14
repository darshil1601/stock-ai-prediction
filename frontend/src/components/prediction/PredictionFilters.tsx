import React from "react";
import type { PredictionTimeframe, Industry } from "../../data/predictionData";
import { INDUSTRIES } from "../../data/predictionData";

const TIMEFRAMES: PredictionTimeframe[] = [
  "1D", "1Week", "30Days", "3Month", "6Month", "1Year",
];

interface Props {
  activeTimeframe: PredictionTimeframe;
  activeIndustry:  Industry;
  resultCount:     number;
  onTimeframe:     (tf: PredictionTimeframe) => void;
  onIndustry:      (ind: Industry) => void;
}

export default function PredictionFilters({
  activeTimeframe,
  activeIndustry,
  resultCount,
  onTimeframe,
  onIndustry,
}: Props) {
  return (
    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]
                    rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4">
      <div className="flex flex-col gap-3 sm:gap-4">

        {/* ── Timeframe button group ── */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Timeframe
          </span>
          <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.02)]
                          border border-[rgba(255,255,255,0.05)] rounded-xl p-1
                          overflow-x-auto scrollbar-none">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframe(tf)}
                className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg flex-shrink-0
                            transition-all duration-150 whitespace-nowrap ${
                  activeTimeframe === tf
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          {/* ── Industry dropdown ── */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              Industry
            </span>
            <div className="relative">
              <select
                value={activeIndustry}
                onChange={(e) => onIndustry(e.target.value as Industry)}
                className="appearance-none w-full sm:w-48 px-4 py-2 pr-8 text-xs font-semibold
                           bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]
                           rounded-xl text-slate-200 cursor-pointer
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                           hover:bg-[rgba(255,255,255,0.06)] transition-colors"
              >
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind} className="bg-slate-900 text-slate-200">
                    {ind}
                  </option>
                ))}
              </select>
              {/* Custom chevron */}
              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2
                           w-3.5 h-3.5 text-slate-400"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* ── Spacer + result count ── */}
          <div className="sm:ml-auto flex items-end pb-0.5">
            <span className="text-xs text-slate-500">
              <span className="text-slate-200 font-semibold">{resultCount}</span>
              {" "}prediction{resultCount !== 1 ? "s" : ""} found
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
