import React, { memo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import type { AIPick, SignalStrength, RiskLevel } from "../../types/home";
import { aiPicks } from "../../data/homeData";
import { formatCurrency } from "../../lib/utils";

// ── Colour maps ───────────────────────────────────────────────────────────────
const signalStyles: Record<SignalStrength, string> = {
  "Strong Buy":
    "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  Buy: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  Hold: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  Sell: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
  "Strong Sell": "bg-rose-700/20 text-rose-400 border border-rose-700/30",
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
        <div className="flex items-center justify-between mb-1 text-[11px]">
          <span className="text-slate-500">AI Confidence</span>
          <span className="font-semibold text-slate-300">{value}%</span>
        </div>
        <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
          <div
            ref={ref}
            className="h-full rounded-full"
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
      <ResponsiveContainer width="100%" height={52}>
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
          <Tooltip
            contentStyle={{ display: "none" }}
            wrapperStyle={{ display: "none" }}
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
      tvSymbol = tvSymbol.endsWith('USD') || tvSymbol.endsWith('USDT') 
        ? `BINANCE:${tvSymbol}` 
        : `BINANCE:${tvSymbol}USDT`;
    }
    else if (['GOLD', 'XAUUSD'].includes(tvSymbol)) {
      tvSymbol = 'OANDA:XAUUSD';
    }
    else if (tvSymbol === 'SILVER') {
      tvSymbol = 'OANDA:XAGUSD';
    }
    else if (tvSymbol === 'CRUDEOIL') {
      tvSymbol = 'TVC:USOIL';
    }
    else if (tvSymbol === 'NATURALGAS') {
      tvSymbol = 'TVC:NATGAS';
    }
    else if (['COPPER', 'ALUMINIUM', 'ZINC'].includes(tvSymbol)) {
      tvSymbol = `TVC:${tvSymbol}`;
    }
    else if (['EURUSD', 'GBPUSD', 'USDJPY'].includes(tvSymbol)) {
      tvSymbol = `OANDA:${tvSymbol}`;
    }
    else if (['USDINR', 'EURINR', 'GBPINR', 'JPYINR'].includes(tvSymbol)) {
      tvSymbol = `FX_IDC:${tvSymbol}`;
    }
    else if (!tvSymbol.includes(":")) {
      tvSymbol = `BSE:${tvSymbol}`;
    }

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
    <div className="pointer-events-none -mx-4 -mt-2 mb-2 min-h-[90px]">
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
      onClick={() => navigate(`/stock/${pick.symbol}`)}
      className="
        group relative cursor-pointer
        bg-slate-800/70 border border-slate-700/50 rounded-2xl p-5
        backdrop-blur-sm transition-all duration-300
        hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30
        hover:border-slate-600/70
      "
    >
      {/* Subtle top accent bar */}
      <div
        className={`
          absolute top-0 left-5 right-5 h-px rounded-full opacity-0
          group-hover:opacity-100 transition-opacity duration-300
          ${pick.signal === "Strong Buy" || pick.signal === "Buy"
            ? "bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent"
            : "bg-gradient-to-r from-transparent via-amber-500/60 to-transparent"
          }
        `}
      />

      {/* Floating Signal badge */}
      <div className="absolute top-4 right-4 z-10">
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${signalStyles[pick.signal]}`}
        >
          {pick.signal}
        </span>
      </div>

      {/* Live Symbol & Price via TV Widget */}
      <TVLivePriceRow symbol={pick.symbol} />

      {/* Local Historical Sparkline Chart */}
      <div className="-mx-1 mb-4 mt-2">
        <PickChart data={pick.sparkline} positive={positive} />
      </div>

      {/* Confidence bar */}
      <ConfidenceBar value={pick.confidence} signal={pick.signal} />

      {/* Risk level */}
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-slate-500">Risk Level</span>
        <span className={`font-semibold ${riskStyles[pick.risk]}`}>
          {pick.risk}
        </span>
      </div>
    </div>
  );
});
PickCard.displayName = "PickCard";

// ── Section ───────────────────────────────────────────────────────────────────
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
              const res = await fetch(`/api/${sym.toLowerCase()}/predict`);
              if (res.ok) {
                const data = await res.json();
                // The AI confidence typically comes back formatted as a percentage in risk_metrics
                // or as a float (0 to 1) in the confidence field.
                const realConfidence = data.risk_metrics?.aiConfidence 
                  ?? (data.confidence ? Math.round(data.confidence * 100) : pick.confidence);
                
                return {
                  ...pick,
                  confidence: realConfidence,
                };
              }
            } catch (err) {
              console.error(`Failed to fetch live prediction for ${sym}`, err);
            }
          }
          return pick;
        })
      );
      if (mounted) {
        setPicks(updated);
      }
    };

    loadRealPredictions();
    return () => { mounted = false; };
  }, []);

  return (
    <section aria-label="Featured AI Picks">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 tracking-wider">
              AI POWERED
            </span>
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mt-1.5">
            Featured AI Picks
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            High-conviction signals · Powered by live model inference
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {picks.map((pick) => (
          <PickCard key={pick.symbol} pick={pick} />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-[11px] text-slate-600 text-center">
        ⚠ AI predictions are for informational purposes only and do not constitute financial advice.
      </p>
    </section>
  );
}
