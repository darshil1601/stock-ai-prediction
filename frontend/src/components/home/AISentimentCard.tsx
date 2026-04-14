import React, { useEffect, useRef, memo } from "react";
import { aiSentiment } from "../../data/homeData";

// ── Animated progress bar ─────────────────────────────────────────────────────
const SentimentBar = memo(({ value }: { value: number }) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
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
      <div className="h-2.5 sm:h-3 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner">
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
      <div className="flex justify-between mt-2 text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
        <span>Bearish Fear</span>
        <span className="opacity-50">50/50</span>
        <span>Bullish Greed</span>
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
        inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold
        ${bullish
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
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
    <section aria-label="AI Market Sentiment" className="relative group">
      {/* Background Glow */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
      
      <div
        className="
          relative overflow-hidden
          bg-[#0b1220]/95 backdrop-blur-md
          border border-slate-800 rounded-2xl p-5 sm:p-7
        "
      >
        {/* Decorative glow blob */}
        <div
          className="
            pointer-events-none absolute -top-16 -right-16 w-64 h-64
            bg-emerald-400/5 rounded-full blur-3xl
          "
        />

        <div className="relative z-10 space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[10px] sm:text-xs font-black text-slate-500 tracking-widest uppercase">
                AI Market Intelligence
              </p>
              <h3 className="mt-1 text-xl sm:text-2xl font-black text-slate-100 leading-tight">
                Global Context ·{" "}
                <span className="text-emerald-400">{label}</span>
              </h3>
            </div>
            <div className="self-start sm:self-center">
                <SentimentPill value={bullishPercent} />
            </div>
          </div>

          {/* Bar */}
          <div className="py-1">
             <SentimentBar value={bullishPercent} />
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl font-medium">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
