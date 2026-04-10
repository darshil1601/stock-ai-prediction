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

function CircularGauge({ value, color, label, sub, size = 86, stroke = 7 }: GaugeProps) {
  const r             = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset    = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-slate-100 tabular-nums leading-none">{value}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs font-semibold text-slate-300">{label}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
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
  normal:  { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", icon: "✅", label: "Normal Market"   },
  caution: { bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20",   icon: "🟡", label: "Caution"         },
  warning: { bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/20",  icon: "🟠", label: "High Volatility"  },
  danger:  { bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/20",    icon: "🔴", label: "Event Alert"      },
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
  LOW:    { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/25" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/25" },
  HIGH:   { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/25" },
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
    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 flex flex-col h-full gap-4">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-rose-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-200">Risk Score</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${alertCfg.bg} ${alertCfg.text} ${alertCfg.border}`}>
            <span>{alertCfg.icon}</span>
            <span>{alertCfg.label}</span>
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${tierCfg.bg} ${tierCfg.text} ${tierCfg.border}`}>
            Event: {eventTier}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {riskLevel} Risk
          </span>
        </div>
      </div>

      {eventDetected && warnings.length > 0 && (
        <div className={`rounded-xl border p-3 ${alertCfg.bg} ${alertCfg.border}`}>
          <div className={`text-[11px] font-bold mb-1.5 uppercase tracking-wider ${alertCfg.text}`}>
            ⚡ Market Event — Confidence Adjusted
          </div>
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-[11px] text-slate-300 leading-snug">{w}</p>
            ))}
          </div>
          {spikeRatio > 1.5 && (
            <div className={`mt-2 text-[10px] font-semibold ${alertCfg.text}`}>
              📊 Price move is {spikeRatio.toFixed(1)}× vs 20-day average volatility
            </div>
          )}
        </div>
      )}

      <div className="flex items-start justify-around gap-2 py-1">
        <CircularGauge value={volatility}    color="#f87171" label="Volatility"    sub="30-day σ"    />
        <CircularGauge value={aiConfidence}  color="#818cf8" label="AI Confidence" sub="MomentumNet" />
        <CircularGauge value={safetyScore}   color={cfg.color} label="Safety Score" sub="Composite" />
      </div>

      <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl px-3 py-2.5">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">News sentiment (FinBERT)</span>
          <span className={`text-[10px] font-bold ${sCol.text}`}>
            {sentimentActive ? `${sentimentLabel} · ${newsCount} articles` : "No aggregate yet"}
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${sentimentActive ? sCol.bar : "bg-slate-600"}`}
            style={{ width: `${sentimentActive ? sentimentToWidth(sentimentScore) : 50}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-rose-400 font-medium">Negative</span>
          <span className="text-[10px] font-bold text-slate-200 tabular-nums">
            {sentimentActive ? sentimentScore.toFixed(2) : "—"}
          </span>
          <span className="text-[9px] text-emerald-400 font-medium">Positive</span>
        </div>
      </div>

      <div className="space-y-2">
        {(
          [
            ["Volatility Index",    `${volatility}%`,   volatility   > 60 ? "🔴 High"    : volatility   > 35 ? "🟡 Medium" : "🟢 Low"    ],
            ["AI Model Confidence", `${aiConfidence}%`, aiConfidence >= 75 ? "💪 Strong"  : aiConfidence >= 60 ? "✅ Moderate" : "⚠️ Weak" ],
            ["Active Model",        "MomentumNet v2",   "Running"],
          ] as [string, string, string][]
        ).map(([lbl, val, badge]) => (
          <div
            key={lbl}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
          >
            <span className="text-xs text-slate-400">{lbl}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-100 tabular-nums">{val}</span>
              <span className="text-[10px] text-slate-500 hidden sm:inline">· {badge}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
