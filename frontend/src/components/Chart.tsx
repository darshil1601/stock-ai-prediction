import React, { useEffect, useRef, useCallback } from "react";
import { getFormattedSymbol } from "../lib/utils";

type ChartProps = {
  symbol: string;
};

export default function Chart({ symbol }: ChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);

  const buildWidget = useCallback(() => {
    if (!containerRef.current) return;
    const root = containerRef.current;

    // Tear down previous widget
    try {
      if (widgetRef.current?.remove) widgetRef.current.remove();
    } catch (_) {}
    root.innerHTML = "";

    const containerId = `tv-advanced-${Date.now()}`;
    const node = document.createElement("div");
    node.id = containerId;
    
    // Responsive height logic: 350px on mobile, 500px on desktop
    const h = window.innerWidth < 640 ? 350 : 500;
    node.style.cssText = `width:100%; height:${h}px;`;
    root.appendChild(node);

    const formatted = getFormattedSymbol(symbol || "");

    try {
      // @ts-ignore
      widgetRef.current = new (window as any).TradingView.widget({
        container_id:      containerId,
        symbol:            formatted,
        interval:          "30",
        timezone:          "Etc/UTC",
        theme:             "dark",
        style:             "1",          // candlestick
        locale:            "en",
        width:             "100%",
        height:            h,
        autosize:          true,
        hide_top_toolbar:  window.innerWidth < 640,
        hide_side_toolbar: window.innerWidth < 640,
        toolbar_bg:        "#0b1220",
        enable_publishing: false,
        allow_symbol_change: false,
        withdateranges:    true,
        backgroundColor:   "#0b1220",
      });
    } catch (err) {}
  }, [symbol]);

  useEffect(() => {
    const scriptId = "tradingview-tv-js";

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
        setTimeout(poll, 200);
      };
      poll();
    }

    // Handle window resize to adjust height
    let resizeTimer: any;
    const handleResize = () => {
       clearTimeout(resizeTimer);
       resizeTimer = setTimeout(buildWidget, 500);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        if (widgetRef.current && typeof widgetRef.current.remove === "function") {
          widgetRef.current.remove();
        }
      } catch (_) {}
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [buildWidget]);

  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
       <div ref={containerRef} className="w-full relative" style={{ minHeight: "350px" }} />
    </div>
  );
}
