import React, { useEffect, useRef, memo } from "react";
import { aiSentiment } from "../../data/homeData";

// ── Animated progress bar ─────────────────────────────────────────────────────
const SentimentBar = memo(({ value }: { value: number }) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    // Animate width from 0 → value%
    el.style.width = "0%";
    const raf = requestAnimationFrame(() => {
      el.style.transition = "width 1.4s cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.width = `${value}%`;
    });
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className="relative">
      {/* Track */}
      <div className="h-3 w-full bg-slate-700/60 rounded-full overflow-hidden">
        {/* Fill */}
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #10b981 0%, #34d399 60%, #6ee7b7 100%)",
            width: "0%",
          }}
        />
      </div>

      {/* Tick marks */}
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
        <span>0% Bearish</span>
        <span>50 Neutral</span>
        <span>100% Bullish</span>
      </div>
    </div>
  );
});
SentimentBar.displayName = "SentimentBar";

// ── Pill indicator ────────────────────────────────────────────────────────────
function SentimentPill({ value }: { value: number }) {
  const bullish = value >= 50;
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold
        ${bullish
          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
          : "bg-rose-500/15 text-rose-400 border border-rose-500/25"
        }
      `}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full animate-pulse ${
          bullish ? "bg-emerald-400" : "bg-rose-400"
        }`}
      />
      {value}% Bullish &nbsp;·&nbsp; {100 - value}% Bearish
    </span>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
export default function AISentimentCard() {
  const { bullishPercent, label, description } = aiSentiment;

  return (
    <section aria-label="AI Market Sentiment">
      <div
        className="
          relative overflow-hidden
          bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-emerald-900/20
          border border-slate-700/50 rounded-2xl p-6
          backdrop-blur-sm
        "
      >
        {/* Decorative glow blob */}
        <div
          className="
            pointer-events-none absolute -top-16 -right-16 w-64 h-64
            bg-emerald-500/8 rounded-full blur-3xl
          "
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-medium text-slate-400 tracking-widest uppercase">
                AI Market Sentiment
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-100">
                Today's Outlook ·{" "}
                <span className="text-emerald-400">{label}</span>
              </h3>
            </div>
            <SentimentPill value={bullishPercent} />
          </div>

          {/* Bar */}
          <SentimentBar value={bullishPercent} />

          {/* Description */}
          <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-2xl">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
