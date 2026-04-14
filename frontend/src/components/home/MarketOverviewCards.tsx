import { memo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const SingleQuoteCard = memo(function SingleQuoteCard({ 
  symbol, 
  title, 
  navPath,
  glowColor,
  borderColor
}: { 
  symbol: string, 
  title: string, 
  navPath: string,
  glowColor: string,
  borderColor: string
}) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: symbol,
      width: "100%",
      isTransparent: true,
      colorTheme: "dark",
      locale: "en"
    });
    containerRef.current.appendChild(script);
  }, [symbol]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View ${title} detail page`}
      onClick={() => navigate(navPath)}
      onKeyDown={(e) => e.key === "Enter" && navigate(navPath)}
      className="relative overflow-hidden rounded-2xl p-4 cursor-pointer
                 transition-all duration-200 ease-out
                 hover:-translate-y-0.5 hover:shadow-xl
                 w-full"
      style={{
        background: "linear-gradient(135deg, rgba(23,32,52,0.97) 0%, rgba(13,18,36,0.99) 60%, rgba(30,26,15,0.6) 100%)",
        border: `1px solid ${borderColor}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 12px 40px ${glowColor.replace("0.13", "0.18")}`;
        e.currentTarget.style.borderColor = glowColor.replace("0.13", "0.35");
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = borderColor;
      }}
    >
      <span
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
        }}
      />
      <div className="tradingview-widget-container w-full pointer-events-none" ref={containerRef} />
      <p className="mt-2 text-[10px] text-slate-500 tracking-wide text-center">
        {symbol.split(":")[1] || symbol} · Click for live chart →
      </p>
    </div>
  );
});

export default function MarketOverviewCards() {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm sm:text-[15px] font-bold text-slate-300 tracking-wide uppercase">
          Market Overview
        </h2>
        <span className="text-[11px] text-slate-500 font-medium">
          Real-time TV Data
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <SingleQuoteCard 
          symbol="OANDA:XAUUSD" 
          title="GOLD" 
          navPath="/stock/GOLD" 
          glowColor="rgba(251,191,36,0.13)" 
          borderColor="rgba(245,158,11,0.16)" 
        />
        <SingleQuoteCard 
          symbol="OANDA:EURUSD" 
          title="EUR/USD" 
          navPath="/stock/EURUSD" 
          glowColor="rgba(56,189,248,0.13)"
          borderColor="rgba(14,165,233,0.16)" 
        />
        <SingleQuoteCard 
          symbol="BITSTAMP:BTCUSD" 
          title="BITCOIN" 
          navPath="/stock/BTC" 
          glowColor="rgba(249,115,22,0.13)"
          borderColor="rgba(234,88,12,0.16)" 
        />
      </div>
    </>
  );
}
