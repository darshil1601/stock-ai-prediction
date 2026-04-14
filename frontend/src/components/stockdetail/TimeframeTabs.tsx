import React from "react";
import type { Timeframe } from "../../types/stock";

const INTRADAY: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h"];
const SWING: Timeframe[]    = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"];

interface Props {
  active: Timeframe;
  onChange: (tf: Timeframe) => void;
}

function Tab({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-tight rounded-lg transition-all duration-150 whitespace-nowrap flex-shrink-0 ${
        isActive
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
          : "text-slate-500 hover:text-slate-200 hover:bg-slate-700/50"
      }`}
    >
      {label}
    </button>
  );
}

export default function TimeframeTabs({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0">
      {/* Intraday group */}
      <div className="flex items-center gap-0.5 bg-slate-950/50 border border-slate-800 rounded-xl p-1 shrink-0">
        <span className="text-[9px] text-slate-600 px-1.5 font-black uppercase tracking-widest hidden xs:block">Intra</span>
        {INTRADAY.map((tf) => (
          <Tab key={tf} label={tf} isActive={active === tf} onClick={() => onChange(tf)} />
        ))}
      </div>

      {/* Vertical Divider */}
      <div className="w-px h-6 bg-slate-800 shrink-0 hidden sm:block" />

      {/* Swing / Long-term group */}
      <div className="flex items-center gap-0.5 bg-slate-950/50 border border-slate-800 rounded-xl p-1 shrink-0">
        <span className="text-[9px] text-slate-600 px-1.5 font-black uppercase tracking-widest hidden xs:block">Swing</span>
        {SWING.map((tf) => (
          <Tab key={tf} label={tf} isActive={active === tf} onClick={() => onChange(tf)} />
        ))}
      </div>
    </div>
  );
}
