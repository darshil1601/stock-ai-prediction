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
    <div className="flex items-center justify-between py-3
                    border-b border-[rgba(255,255,255,0.04)] last:border-0">
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-100 tabular-nums">{value}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${tagStyle}`}>
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
  const entryLabel = isSell ? "Sell Zone" : isHold ? "Watch Zone" : "Buy Zone";
  const entryTag   = isSell ? "SELL"      : isHold ? "OBSERVE"    : "BUY";

  const entryDotColor = isSell
    ? "bg-rose-400"
    : isHold
    ? "bg-amber-400"
    : "bg-emerald-400";

  const entryTagStyle = isSell
    ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
    : isHold
    ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";

  const headerBarColor = isSell
    ? "bg-rose-500"
    : isHold
    ? "bg-amber-500"
    : "bg-emerald-500";

  // clamp visual bar at 5:1 ratio = 100 %
  const rrBarWidth = Math.min((riskReward / 5) * 100, 100);

  return (
    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]
                    rounded-2xl p-5 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-1.5 h-5 rounded-full ${headerBarColor} flex-shrink-0`} />
        <span className="text-sm font-semibold text-slate-200">Entry / Exit Intelligence</span>
        {isHold && (
          <span className="ml-auto text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
            ⏸ Neutral — No Clear Edge
          </span>
        )}
      </div>

      {/* Zone Rows */}
      <div className="flex-1">
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
          tagStyle={isSell ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" : "bg-rose-500/10 text-rose-400 border-rose-500/25"}
        />
        <ZoneRow
          label="Target 1"
          value={formatCurrency(target1, currency)}
          dotColor="bg-amber-400"
          tag="T1"
          tagStyle="bg-amber-500/10 text-amber-400 border-amber-500/25"
        />
        <ZoneRow
          label="Target 2"
          value={formatCurrency(target2, currency)}
          dotColor="bg-blue-400"
          tag="T2"
          tagStyle="bg-blue-500/10 text-blue-400 border-blue-500/25"
        />
      </div>

      {/* Risk : Reward */}
      <div className="mt-4 p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)]
                      border border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Risk : Reward</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-slate-500">1 :</span>
            <span className="text-lg font-bold text-emerald-400 tabular-nums">{riskReward}</span>
          </div>
        </div>
        {/* Gradient bar */}
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 transition-all duration-700 ease-out"
            style={{ width: `${rrBarWidth}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-600">
          <span>Risk</span>
          <span>Reward</span>
        </div>
      </div>
    </div>
  );
}
