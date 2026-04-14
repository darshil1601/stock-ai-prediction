import React from "react";
import type { RiskMetrics, MarketIntelligence } from "../../types/stock";

// ─── Circular SVG Gauge ───────────────────────────────────────────────────────
interface GaugeProps {
  value: number;
  color: string;
  label: string;
  sub: string;
  size?: number;
  stroke?: number;
}

function CircularGauge({ value, color, label, sub, size = 80, stroke = 6 }: GaugeProps) {
  const r             = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset    = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 3px ${color}66)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs sm:text-sm font-black text-slate-100 tabular-nums leading-none tracking-tighter">{value}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-tight">{label}</div>
        <div className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

// ─── Config maps ──────────────────────────────────────────────────────────────
const RISK_CFG = {
  Low:    { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", color: "#34d399" },
  Medium: { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   color: "#fbbf24" },
  High:   { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/20",     color: "#f87171" },
} as const;

const ALERT_CFG = {
  normal:  { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: "✓", label: "Normal"   },
  caution: { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   icon: "!", label: "Caution"   },
  warning: { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/20",  icon: "!", label: "High Vol"  },
  danger:  { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/20",    icon: "!!", label: "Event"    },
} as const;

function sentimentToWidth(score: number) {
  const t = (score + 1) / 2;
  return Math.round(Math.max(0, Math.min(1, t)) * 100);
}

function sentimentColor(score: number) {
  if (score < -0.05) return { bar: "bg-rose-500", text: "text-rose-400" };
  if (score > 0.05) return { bar: "bg-emerald-500", text: "text-emerald-400" };
  return { bar: "bg-slate-500", text: "text-slate-300" };
}

const TIER_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  LOW:    { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  HIGH:   { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props {
  metrics: RiskMetrics;
  marketIntelligence?: MarketIntelligence;
}

export default function RiskScoreCard({ metrics, marketIntelligence }: Props) {
  const { volatility, aiConfidence, riskLevel } = metrics;
  const cfg = RISK_CFG[riskLevel];

  const safetyScore = Math.round(aiConfidence * 0.55 + (100 - volatility) * 0.45);

  const alert         = marketIntelligence?.market_alert    ?? metrics.market_alert    ?? "normal";
  const alertCfg      = ALERT_CFG[alert];
  const eventDetected = marketIntelligence?.event_detected   ?? metrics.event_detected   ?? false;
  const warnings      = marketIntelligence?.warnings         ?? [];
  const spikeRatio    = marketIntelligence?.spike_ratio      ?? 1.0;

  const sentimentScore = marketIntelligence?.sentiment_score ?? metrics.sentiment_score ?? 0;
  const sentimentLabel = marketIntelligence?.sentiment_label ?? metrics.sentiment_label ?? "neutral";
  const newsCount      = marketIntelligence?.news_count ?? metrics.news_count ?? 0;
  const eventTier      = marketIntelligence?.event_tier ?? metrics.event_tier ?? "LOW";
  const tierCfg        = TIER_BADGE[eventTier] ?? TIER_BADGE.LOW;
  const sCol           = sentimentColor(sentimentScore);
  const sentimentActive = newsCount > 0 || (marketIntelligence?.sentiment_applied ?? false);

  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-5 sm:p-7 flex flex-col h-full gap-5 sm:gap-6 shadow-2xl relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-6 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)] flex-shrink-0" />
          <div>
             <span className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-widest block">Safe Guard Pro</span>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Risk Assessment Log</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          <span className={`text-[9px] font-black px-2 py-1 rounded-lg border flex items-center gap-1 uppercase tracking-tight shadow-sm ${alertCfg.bg} ${alertCfg.text} ${alertCfg.border}`}>
            <span>{alertCfg.icon}</span>
            <span>{alertCfg.label}</span>
          </span>
          <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-tight shadow-sm ${tierCfg.bg} ${tierCfg.text} ${tierCfg.border}`}>
            Tier: {eventTier}
          </span>
          <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-tight shadow-sm ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {riskLevel} Risk
          </span>
        </div>
      </div>

      {eventDetected && warnings.length > 0 && (
        <div className={`rounded-xl border p-3 sm:p-4 bg-slate-950/40 relative z-10 ${alertCfg.border}`}>
          <div className={`text-[10px] font-black mb-1.5 uppercase tracking-widest flex items-center gap-2 ${alertCfg.text}`}>
            <span className="animate-pulse">⚡</span> High Impact Cluster Detected
          </div>
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <p key={i} className="text-[11px] text-slate-400 font-medium leading-relaxed italic border-l-2 border-slate-800 pl-3">{w}</p>
            ))}
          </div>
          {spikeRatio > 1.3 && (
            <div className={`mt-3 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${alertCfg.text}`}>
              <span className="p-1 rounded bg-current/10">📊</span> Volatility spike is {spikeRatio.toFixed(1)}x normal baseline
            </div>
          )}
        </div>
      )}

      <div className="flex flex-row items-center justify-around gap-2 py-2 sm:py-4 relative z-10 flex-wrap sm:flex-nowrap">
        <CircularGauge value={volatility}    color="#f87171" label="Volatility"    sub="30D StdDev" />
        <CircularGauge value={aiConfidence}  color="#818cf8" label="AI Strength"   sub="Neural Con" />
        <CircularGauge value={safetyScore}   color={cfg.color} label="Safety Rating" sub="Aggregated" />
      </div>

      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-3.5 relative z-10 shadow-inner">
        <div className="flex items-center justify-between mb-2.5 gap-2 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">FinBERT News Stream</span>
          <span className={`text-[9px] font-black uppercase tracking-tight ${sCol.text}`}>
            {sentimentActive ? `${sentimentLabel} · ${newsCount} Sources` : "No Active Stream"}
          </span>
        </div>
        <div className="h-2 bg-slate-900 rounded-full overflow-hidden relative shadow-inner border border-slate-800/50">
          <div
            className={`h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_currentColor] ${sentimentActive ? sCol.bar : "bg-slate-700"}`}
            style={{ width: `${sentimentActive ? sentimentToWidth(sentimentScore) : 50}%` }}
          />
        </div>
        <div className="flex justify-between mt-2.5">
          <span className="text-[8px] sm:text-[9px] text-rose-500 font-black uppercase tracking-widest">Negative</span>
          <span className="text-[10px] font-black text-slate-300 tabular-nums">
            {sentimentActive ? sentimentScore.toFixed(2) : "0.00"}
          </span>
          <span className="text-[8px] sm:text-[9px] text-emerald-500 font-black uppercase tracking-widest">Positive</span>
        </div>
      </div>

      <div className="space-y-2.5 relative z-10">
        {(
          [
            ["Historical Volatility", `${volatility}%`,   volatility   > 60 ? "CRITICAL" : volatility   > 35 ? "STABLE" : "OPTIMAL" ],
            ["AI Confidence Level",   `${aiConfidence}%`, aiConfidence >= 75 ? "SUPERIOR" : aiConfidence >= 60 ? "VERIFIED" : "WATCH" ],
            ["Analysis Logic",        "MomentumNet v2",   "ACTIVE"],
          ] as [string, string, string][]
        ).map(([lbl, val, badge]) => (
          <div
            key={lbl}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-950/30 border border-slate-800/50 group/item hover:bg-slate-900/50 transition-colors"
          >
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest group-hover/item:text-slate-400 transition-colors">{lbl}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-black text-slate-100 tabular-nums tracking-tight">{val}</span>
              <span className="hidden sm:inline-block text-[9px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 uppercase tracking-widest">{badge}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
