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
    node.style.cssText = "width:100%; height:520px;";
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
        height:            520,
        hide_top_toolbar:  false,
        hide_side_toolbar: false,
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
      // Script tag already inserted but not yet ready
      const poll = () => {
        if ((window as any).TradingView) { buildWidget(); return; }
        setTimeout(poll, 150);
      };
      poll();
    }

    return () => {
      try { if (widgetRef.current?.remove) widgetRef.current.remove(); } catch (_) {}
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [buildWidget]);

  return (
    <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
                      px-5 py-3.5 border-b border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-indigo-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-slate-200">Candlestick Chart</span>
          <span className="text-xs text-slate-600 ml-1">OHLCV · Real-time</span>
        </div>
        <TimeframeTabs active={activeTimeframe} onChange={onTimeframeChange} />
      </div>

      {/* Chart mount point */}
      <div 
        ref={containerRef} 
        className="w-full" 
        style={{ minHeight: "520px", background: "#0b1220" }} 
      />
    </div>
  );
}
