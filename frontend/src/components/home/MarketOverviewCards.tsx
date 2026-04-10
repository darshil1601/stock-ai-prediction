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
      style={{
        background: "linear-gradient(135deg, rgba(23,32,52,0.97) 0%, rgba(13,18,36,0.99) 60%, rgba(30,26,15,0.6) 100%)",
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        padding: "16px",
        position: "relative",
        overflow: "hidden",
        width: "100%",
        maxWidth: 320,
        cursor: "pointer",
        transition: "transform 0.18s ease, box-shadow 0.18s ease"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 12px 40px ${glowColor.replace("0.13", "0.18")}`;
        e.currentTarget.style.borderColor = glowColor.replace("0.13", "0.35");
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = borderColor;
      }}
    >
      <span
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      <div className="tradingview-widget-container" ref={containerRef} style={{ pointerEvents: "none" }}></div>
      <p style={{ margin: "10px 0 0", fontSize: 10, color: "#475569", letterSpacing: "0.05em", textAlign: "center" }}>
        {symbol.split(":")[1] || symbol} · Click for live chart →
      </p>
    </div>
  );
});

export default function MarketOverviewCards() {
  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#cbd5e1", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Market Overview
        </h2>
        <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>
          Real-time TV Data
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
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
