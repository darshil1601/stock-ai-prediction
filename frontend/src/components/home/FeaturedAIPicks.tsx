import React, { memo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import type { AIPick, SignalStrength, RiskLevel } from "../../types/home";
import { aiPicks } from "../../data/homeData";
import { formatCurrency } from "../../lib/utils";
import { api } from "../../services/api";

// ── Colour maps ───────────────────────────────────────────────────────────────
const signalStyles: Record<SignalStrength, string> = {
  "Strong Buy": "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  Buy: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  Hold: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  Sell: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  "Strong Sell": "bg-rose-700/10 text-rose-400 border border-rose-700/20",
};

const riskStyles: Record<RiskLevel, string> = {
  Low: "text-emerald-400",
  Medium: "text-amber-400",
  High: "text-rose-400",
};

const confBarColor: Record<SignalStrength, string> = {
  "Strong Buy": "#10b981",
  Buy: "#0d9488",
  Hold: "#f59e0b",
  Sell: "#f87171",
  "Strong Sell": "#ef4444",
};

// ── Animated confidence bar ───────────────────────────────────────────────────
const ConfidenceBar = memo(
  ({ value, signal }: { value: number; signal: SignalStrength }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      el.style.width = "0%";
      const raf = requestAnimationFrame(() => {
        el.style.transition = "width 1.2s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.width = `${value}%`;
      });
      return () => cancelAnimationFrame(raf);
    }, [value]);

    return (
      <div>
        <div className="flex items-center justify-between mb-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-tighter">
          <span className="text-slate-500">AI Trust Score</span>
          <span className="text-slate-200">{value}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
          <div
            ref={ref}
            className="h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all"
            style={{ backgroundColor: confBarColor[signal], width: "0%" }}
          />
        </div>
      </div>
    );
  }
);
ConfidenceBar.displayName = "ConfidenceBar";

// ── Mini area chart ───────────────────────────────────────────────────────────
const PickChart = memo(
  ({ data, positive }: { data: number[]; positive: boolean }) => {
    const chartData = data.map((v, i) => ({ i, v }));
    const color = positive ? "#10b981" : "#f87171";
    return (
      <ResponsiveContainer width="100%" height={48}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={`grad-${positive}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${positive})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }
);
PickChart.displayName = "PickChart";

// ── TV Live Price Widget ────────────────────────────────────────────────────────
const TVLivePriceRow = memo(({ symbol }: { symbol: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    
    let tvSymbol = symbol.toUpperCase();
    const cryptoKeywords = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'BNB', 'MATIC'];
    if (cryptoKeywords.some(s => tvSymbol.includes(s))) {
      tvSymbol = tvSymbol.endsWith('USD') || tvSymbol.endsWith('USDT') ? `BINANCE:${tvSymbol}` : `BINANCE:${tvSymbol}USDT`;
    }
    else if (['GOLD', 'XAUUSD'].includes(tvSymbol)) tvSymbol = 'OANDA:XAUUSD';
    else if (tvSymbol === 'SILVER') tvSymbol = 'OANDA:XAGUSD';
    else if (tvSymbol === 'CRUDEOIL') tvSymbol = 'TVC:USOIL';
    else if (tvSymbol === 'NATURALGAS') tvSymbol = 'TVC:NATGAS';
    else if (!tvSymbol.includes(":")) tvSymbol = `BSE:${tvSymbol}`;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: "100%",
      isTransparent: true,
      colorTheme: "dark",
      locale: "en"
    });
    
    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    wrapper.appendChild(inner);
    wrapper.appendChild(script);
    containerRef.current.appendChild(wrapper);
  }, [symbol]);

  return (
    <div className="pointer-events-none -mx-4 -mt-1 sm:-mt-2 mb-1 min-h-[85px] sm:min-h-[90px]">
      <div ref={containerRef} />
    </div>
  );
});
TVLivePriceRow.displayName = "TVLivePriceRow";

// ── Single pick card ──────────────────────────────────────────────────────────
const PickCard = memo(({ pick }: { pick: AIPick }) => {
  const navigate = useNavigate();
  const positive = pick.change >= 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/stock/${pick.symbol}`)}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/stock/${pick.symbol}`)}
      className="
        group relative cursor-pointer
        bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-5
        backdrop-blur-sm transition-all duration-300
        hover:-translate-y-1.5 hover:bg-slate-800/60 hover:border-slate-700
        active:scale-[0.98]
      "
    >
      <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10">
        <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-tight ${signalStyles[pick.signal]}`}>
          {pick.signal}
        </span>
      </div>

      <TVLivePriceRow symbol={pick.symbol} />

      <div className="-mx-1 mb-3 sm:mb-4">
        <PickChart data={pick.sparkline} positive={positive} />
      </div>

      <ConfidenceBar value={pick.confidence} signal={pick.signal} />

      <div className="mt-3 sm:mt-4 flex items-center justify-between text-[10px] sm:text-[11px] font-bold uppercase tracking-tighter">
        <span className="text-slate-500">Stability Index</span>
        <span className={riskStyles[pick.risk]}>
          {pick.risk} Risk
        </span>
      </div>
    </div>
  );
});
PickCard.displayName = "PickCard";

export default function FeaturedAIPicks() {
  const [picks, setPicks] = React.useState<AIPick[]>(aiPicks);

  React.useEffect(() => {
    let mounted = true;
    const loadRealPredictions = async () => {
      const updated = await Promise.all(
        aiPicks.map(async (pick) => {
          const sym = pick.symbol.toUpperCase();
          if (["BTC", "GOLD", "EURUSD", "XAUUSD"].includes(sym)) {
            try {
              const data = await api.getPrediction(sym);
              const realConfidence = data.risk_metrics?.aiConfidence 
                ?? (data.confidence ? Math.round(data.confidence * 100) : pick.confidence);
              return { ...pick, confidence: realConfidence };
            } catch (err) { console.error(err); }
          }
          return pick;
        })
      );
      if (mounted) setPicks(updated);
    };
    loadRealPredictions();
    return () => { mounted = false; };
  }, []);

  return (
    <section aria-label="Featured AI Picks" className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-widest uppercase">
            AI Engine
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-2 tracking-tight">
            High Confidence Picks
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium font-italic">
            Proprietary MomentumNet v2 inference logic
          </p>
        </div>
        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest hidden sm:block">
          Signals updated 24/7
        </span>
      </div>

      <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {picks.map((pick) => (
          <PickCard key={pick.symbol} pick={pick} />
        ))}
      </div>

      <div className="mt-4 p-3 rounded-xl bg-slate-900/30 border border-slate-800/50 text-center">
        <p className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
          ⚠ Market Intelligence Disclaimer: Predictions are probabilistic and subject to high volatility risks.
        </p>
      </div>
    </section>
  );
}
