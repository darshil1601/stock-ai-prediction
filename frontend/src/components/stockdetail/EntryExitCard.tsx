import React from "react";
import type { EntryExitZones } from "../../types/stock";
import { formatCurrency } from "../../lib/utils";

interface Props {
  zones: EntryExitZones;
  currency?: string;
}

interface RowProps {
  label: string;
  value: string;
  dotColor: string;
  tag: string;
  tagStyle: string;
}

function ZoneRow({ label, value, dotColor, tag, tagStyle }: RowProps) {
  return (
    <div className="flex items-center justify-between py-3.5 sm:py-4
                    border-b border-slate-800/60 last:border-0 group/row">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor} shadow-[0_0_8px_currentColor]`} />
        <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest group-hover/row:text-slate-400 transition-colors">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="text-xs sm:text-sm font-black text-slate-100 tabular-nums tracking-tight">{value}</span>
        <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-lg font-black border tracking-tighter shadow-sm ${tagStyle}`}>
          {tag}
        </span>
      </div>
    </div>
  );
}

export default function EntryExitCard({ zones, currency = "INR" }: Props) {
  const { signal, signalZone, stopLoss, target1, target2, riskReward } = zones;

  const isSell = signal === "SELL";
  const isHold = signal === "HOLD";
  const entryLabel = isSell ? "Short Zone" : isHold ? "Observation" : "Entry Zone";
  const entryTag   = isSell ? "SHORT"      : isHold ? "IDLE"       : "ENTRY";

  const entryDotColor = isSell
    ? "bg-rose-400"
    : isHold
    ? "bg-amber-400"
    : "bg-emerald-400";

  const entryTagStyle = isSell
    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
    : isHold
    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

  const headerBarColor = isSell
    ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
    : isHold
    ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
    : "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]";

  const rrBarWidth = Math.min((riskReward / 5) * 100, 100);

  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 sm:p-7 flex flex-col h-full shadow-2xl relative overflow-hidden">
      {/* Background Decor */}
      <div className={`absolute -top-10 -left-10 w-32 h-32 rounded-full blur-[80px] pointer-events-none opacity-20 ${isSell ? 'bg-rose-500' : 'bg-emerald-500'}`} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5 sm:mb-6">
        <span className={`w-1.5 h-6 rounded-full ${headerBarColor} flex-shrink-0`} />
        <div>
           <span className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-widest block">Trade Intelligence</span>
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">AI Strategy Layer</p>
        </div>
        {isHold && (
          <span className="ml-auto text-[9px] font-black px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest shadow-sm">
            Neutral Edge
          </span>
        )}
      </div>

      {/* Zone Rows */}
      <div className="flex-1 space-y-1">
        <ZoneRow
          label={entryLabel}
          value={`${formatCurrency(signalZone[0], currency)} – ${formatCurrency(signalZone[1], currency)}`}
          dotColor={entryDotColor}
          tag={entryTag}
          tagStyle={entryTagStyle}
        />
        <ZoneRow
          label="Stop Loss"
          value={formatCurrency(stopLoss, currency)}
          dotColor={isSell ? "bg-emerald-400" : "bg-rose-400"}
          tag="SL"
          tagStyle={isSell ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}
        />
        <ZoneRow
          label="Profit Target 1"
          value={formatCurrency(target1, currency)}
          dotColor="bg-sky-400"
          tag="T1"
          tagStyle="bg-sky-500/10 text-sky-400 border-sky-500/20"
        />
        <ZoneRow
          label="Profit Target 2"
          value={formatCurrency(target2, currency)}
          dotColor="bg-violet-400"
          tag="T2"
          tagStyle="bg-violet-500/10 text-violet-400 border-violet-500/20"
        />
      </div>

      {/* Risk : Reward */}
      <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800 shadow-inner">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] sm:text-xs text-slate-500 font-black uppercase tracking-widest">Efficiency Multiplier</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold text-slate-600">RR</span>
            <span className="text-lg sm:text-xl font-black text-emerald-400 tabular-nums tracking-tighter">1 : {riskReward}</span>
          </div>
        </div>
        {/* Gradient bar */}
        <div className="h-2 rounded-full bg-slate-900 border border-slate-800/50 overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-1000 ease-out"
            style={{ width: `${rrBarWidth}%` }}
          />
        </div>
        <div className="flex justify-between mt-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-600">
          <span>High Risk</span>
          <span>High Reward</span>
        </div>
      </div>
    </div>
  );
}
