import React, { memo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, LineChart, Line } from "recharts";
import type { Asset } from "../../types/stock";
import { formatCurrency } from "../../lib/utils";

// ── Mini sparkline ────────────────────────────────────────────────────────────
const MiniSpark = memo(
  ({ data, positive }: { data: number[]; positive: boolean }) => {
    const chartData = (data ?? []).map((v, i) => ({ i, v }));
    return (
      <ResponsiveContainer width={56} height={28}>
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={positive ? "#34d399" : "#f87171"}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }
);
MiniSpark.displayName = "MiniSpark";

// ── Single mover row with TradingView Widget ───────────────────────────────────
const TVMoverRow = memo(
  ({ stock, rank, isGainer }: { stock: Asset; rank: number; isGainer: boolean }) => {
    const container = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
      let tvSymbol = stock.symbol.toUpperCase();
      
      // Auto-resolve known Crypto assets
      const cryptoKeywords = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'BNB', 'MATIC'];
      if (cryptoKeywords.some(s => tvSymbol.includes(s))) {
        tvSymbol = tvSymbol.endsWith('USD') || tvSymbol.endsWith('USDT') 
          ? `BINANCE:${tvSymbol}` 
          : `BINANCE:${tvSymbol}USDT`;
      }
      // Resolve Commodities
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
      // Resolve Forex
      else if (['EURUSD', 'GBPUSD', 'USDJPY'].includes(tvSymbol)) {
        tvSymbol = `OANDA:${tvSymbol}`;
      }
      else if (['USDINR', 'EURINR', 'GBPINR', 'JPYINR'].includes(tvSymbol)) {
        tvSymbol = `FX_IDC:${tvSymbol}`;
      }
      // Fallback for generic Indian stocks
      else if (!tvSymbol.includes(":")) {
        tvSymbol = `BSE:${tvSymbol}`;
      }

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        "symbol": tvSymbol,
        "width": "100%",
        "isTransparent": true,
        "colorTheme": "dark",
        "locale": "en"
      });

      if (container.current) {
        container.current.innerHTML = "";
        container.current.appendChild(script);
      }
    }, [stock.symbol]);

    const glowColor = isGainer ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)";
    const borderColor = isGainer ? "rgba(16,185,129,0.2)" : "rgba(225,29,72,0.2)";

    return (
      <div 
        className="group relative w-full cursor-pointer rounded-xl overflow-hidden mb-3 last:mb-0 transition-all p-3"
        style={{
          background: "linear-gradient(135deg, rgba(30,41,59,0.6) 0%, rgba(15,23,42,0.8) 100%)",
          border: `1px solid ${borderColor}`,
        }}
        onClick={() => navigate(`/stock/${stock.symbol}`)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = `0 8px 25px ${glowColor.replace("0.15", "0.25")}`;
          e.currentTarget.style.borderColor = glowColor.replace("0.15", "0.4");
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.borderColor = borderColor;
        }}
      >
        {/* Transparent overlay to catch clicks */}
        <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />
        
        {/* Subtle radial glow inside */}
        <span
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Rank Badge */}
        <div className="absolute top-3 left-3 z-20 flex items-center justify-center w-5 h-5 bg-slate-900/80 text-[10px] text-slate-300 rounded font-bold shadow-sm pointer-events-none border border-slate-700/50">
          {rank}
        </div>

        {/* The Widget Container */}
        <div className="tradingview-widget-container w-full pointer-events-none pl-6" ref={container}></div>
        
        <p className="mt-1 text-center text-[10px] text-slate-500 font-medium tracking-wide">
          Click for live chart & details →
        </p>
      </div>
    );
  }
);
TVMoverRow.displayName = "TVMoverRow";

// ── Column (Gainers or Losers) ────────────────────────────────────────────────
const MoverColumn = memo(
  ({
    title,
    stocks,
    accentClass,
    dotClass,
  }: {
    title: string;
    stocks: Asset[];
    accentClass: string;
    dotClass: string;
  }) => (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Column header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/40">
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <h3 className={`text-sm font-semibold ${accentClass}`}>{title}</h3>
        <span className="ml-auto text-xs text-slate-500">Top {stocks.length}</span>
      </div>

      {/* Rows */}
      <div className="py-1">
        {stocks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            No data for selected category
          </p>
        ) : (
          stocks.map((s, i) => (
            <TVMoverRow key={s.symbol} stock={s} rank={i + 1} isGainer={title.includes("Gainers")} />
          ))
        )}
      </div>
    </div>
  )
);
MoverColumn.displayName = "MoverColumn";

// ── Section ───────────────────────────────────────────────────────────────────
interface TopMoversProps {
  gainers: Asset[];
  losers: Asset[];
}

export default function TopMovers({ gainers, losers }: TopMoversProps) {
  return (
    <section aria-label="Top Movers">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Top Movers</h2>
          <p className="text-xs text-slate-500 mt-0.5">Filtered by category · today</p>
        </div>
        <span className="text-xs text-slate-500 hidden sm:block">
          Click any row to view details →
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MoverColumn
          title="Top Gainers"
          stocks={gainers}
          accentClass="text-emerald-400"
          dotClass="bg-emerald-400"
        />
        <MoverColumn
          title="Top Losers"
          stocks={losers}
          accentClass="text-rose-400"
          dotClass="bg-rose-400"
        />
      </div>
    </section>
  );
}
