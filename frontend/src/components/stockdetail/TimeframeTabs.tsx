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
      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap ${
        isActive
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}

export default function TimeframeTabs({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Intraday group */}
      <div className="flex items-center gap-0.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-1">
        <span className="text-[10px] text-slate-600 px-1.5 font-medium uppercase tracking-wider">Intraday</span>
        {INTRADAY.map((tf) => (
          <Tab key={tf} label={tf} isActive={active === tf} onClick={() => onChange(tf)} />
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10" />

      {/* Swing / Long-term group */}
      <div className="flex items-center gap-0.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl p-1">
        <span className="text-[10px] text-slate-600 px-1.5 font-medium uppercase tracking-wider">Swing</span>
        {SWING.map((tf) => (
          <Tab key={tf} label={tf} isActive={active === tf} onClick={() => onChange(tf)} />
        ))}
      </div>
    </div>
  );
}
