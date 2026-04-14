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

    return (
      <div 
        role="button"
        tabIndex={0}
        className={`
          group relative w-full cursor-pointer rounded-xl overflow-hidden mb-2.5 last:mb-0 
          transition-all duration-200 p-2 sm:p-3
          hover:-translate-y-1 active:scale-[0.98]
          bg-gradient-to-br from-slate-800/80 to-slate-900/90
          border
          ${isGainer 
            ? "border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_8px_25px_rgba(52,211,153,0.15)]" 
            : "border-rose-500/20 hover:border-rose-500/40 hover:shadow-[0_8px_25px_rgba(248,113,113,0.15)]"
          }
        `}
        onClick={() => navigate(`/stock/${stock.symbol}`)}
        onKeyDown={(e) => e.key === "Enter" && navigate(`/stock/${stock.symbol}`)}
      >
        {/* Transparent overlay to catch clicks */}
        <div className="absolute inset-0 z-10 bg-transparent pointer-events-auto" />
        
        {/* Subtle radial glow inside */}
        <span
          className={`
            absolute -top-5 -right-5 w-20 h-20 rounded-full blur-2xl pointer-events-none opacity-40
            ${isGainer ? "bg-emerald-500/20" : "bg-rose-500/20"}
          `}
        />

        {/* Rank Badge */}
        <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 z-20 flex items-center justify-center 
                        w-5 h-5 bg-slate-950 text-[10px] text-slate-300 rounded font-bold 
                        shadow-sm pointer-events-none border border-slate-800">
          {rank}
        </div>

        {/* The Widget Container */}
        <div className="tradingview-widget-container w-full pointer-events-none pl-5 sm:pl-6" ref={container}></div>
        
        <p className="mt-1 text-center text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-wide">
          Tap for live analysis →
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
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800">
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <h3 className={`text-xs sm:text-sm font-semibold uppercase tracking-wider ${accentClass}`}>{title}</h3>
        <span className="ml-auto text-[10px] sm:text-xs text-slate-500 font-medium">Top {stocks.length}</span>
      </div>

      {/* Rows */}
      <div className="p-2 sm:p-3">
        {stocks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">
            No data available
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
    <section aria-label="Top Movers" className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-md sm:text-lg font-bold text-slate-100 tracking-tight">Market Momentum</h2>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium italic">Leaders & laggards by volatility</p>
        </div>
        <span className="text-[10px] text-slate-600 hidden sm:block font-medium">
          Real-time exchange data
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <MoverColumn
          title="Gainers"
          stocks={gainers}
          accentClass="text-emerald-400"
          dotClass="bg-emerald-400"
        />
        <MoverColumn
          title="Losers"
          stocks={losers}
          accentClass="text-rose-400"
          dotClass="bg-rose-400"
        />
      </div>
    </section>
  );
}
