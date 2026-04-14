import React, { useEffect, useRef, useCallback } from "react";
import type { Timeframe } from "../../types/stock";
import TimeframeTabs from "./TimeframeTabs";
import { getFormattedSymbol } from "../../lib/utils";

// TradingView interval codes
const TV_INTERVAL: Record<Timeframe, string> = {
  "1m":  "1",
  "5m":  "5",
  "15m": "15",
  "30m": "30",
  "1h":  "60",
  "4h":  "240",
  "1D":  "D",
  "1W":  "W",
  "1M":  "M",
  "3M":  "D",   // daily candles — user scrolls back 3 months
  "6M":  "W",   // weekly candles
  "1Y":  "W",
  "5Y":  "M",   // monthly candles
};

interface Props {
  symbol: string;
  activeTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export default function CandlestickChartSection({
  symbol,
  activeTimeframe,
  onTimeframeChange,
}: Props) {
  const containerRef  = useRef<HTMLDivElement | null>(null);
  const widgetRef     = useRef<any>(null);
  const intervalStr   = TV_INTERVAL[activeTimeframe];
  const tvSymbol      = getFormattedSymbol(symbol);

  const buildWidget = useCallback(() => {
    if (!containerRef.current) return;
    const root = containerRef.current;

    // Tear down previous widget
    try {
      if (widgetRef.current?.remove) widgetRef.current.remove();
    } catch (_) {}
    root.innerHTML = "";

    const id   = `tv-${symbol}-${Date.now()}`;
    const node = document.createElement("div");
    node.id    = id;
    
    // Responsive height logic: 350px on mobile, 520px on desktop
    const h = window.innerWidth < 640 ? 350 : 520;
    node.style.cssText = `width:100%; height:${h}px;`;
    root.appendChild(node);

    try {
      widgetRef.current = new (window as any).TradingView.widget({
        container_id:      id,
        symbol:            tvSymbol,
        interval:          intervalStr,
        timezone:          "Asia/Kolkata",
        theme:             "dark",
        style:             "1",          // candlestick
        locale:            "en",
        width:             "100%",
        height:            h,
        hide_top_toolbar:  window.innerWidth < 640,
        hide_side_toolbar: window.innerWidth < 640,
        toolbar_bg:        "#0b1220",
        enable_publishing: false,
        allow_symbol_change: false,
        withdateranges:    true,
        backgroundColor:   "#0b1220",
      });
    } catch (_) {}
  }, [symbol, intervalStr, tvSymbol]);

  useEffect(() => {
    const scriptId = "tv-lib-script";

    if ((window as any).TradingView) {
      buildWidget();
    } else if (!document.getElementById(scriptId)) {
      const s   = document.createElement("script");
      s.id      = scriptId;
      s.src     = "https://s3.tradingview.com/tv.js";
      s.async   = true;
      s.onload  = buildWidget;
      document.body.appendChild(s);
    } else {
      const poll = () => {
        if ((window as any).TradingView) { buildWidget(); return; }
        setTimeout(poll, 150);
      };
      poll();
    }

    // Standard resize handling to rebuild widget with new height if needed
    let resizeTimer: any;
    const handleResize = () => {
       clearTimeout(resizeTimer);
       resizeTimer = setTimeout(buildWidget, 500);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try { if (widgetRef.current?.remove) widgetRef.current.remove(); } catch (_) {}
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [buildWidget]);

  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
                      px-5 py-4 sm:py-3.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)] flex-shrink-0" />
          <div>
             <span className="text-xs sm:text-sm font-black text-slate-100 uppercase tracking-widest">Global Candlestick</span>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">OHLCV · Real-time Feed</p>
          </div>
        </div>
        <div className="overflow-x-auto">
           <TimeframeTabs active={activeTimeframe} onChange={onTimeframeChange} />
        </div>
      </div>

      {/* Chart mount point */}
      <div 
        ref={containerRef} 
        className="w-full relative" 
        style={{ minHeight: "350px", background: "#0b1220" }} 
      />
    </div>
  );
}
