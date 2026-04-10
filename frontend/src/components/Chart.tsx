import React, { useEffect, useRef } from "react";
import { getFormattedSymbol } from "../lib/utils";

type ChartProps = {
  symbol: string;
};

export default function Chart({ symbol }: ChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    // clear previous
    container.innerHTML = "";

    const containerId = `tv-advanced-${Date.now()}`;
    const node = document.createElement("div");
    node.id = containerId;
    node.style.width = "100%";
    node.style.height = "500px";
    container.appendChild(node);

    const formatted = getFormattedSymbol(symbol || "");

    function createWidget() {
      try {
        // @ts-ignore
        widgetRef.current = new (window as any).TradingView.widget({
          container_id: containerId,
          symbol: formatted,
          interval: "30",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          autosize: true,
          hide_top_toolbar: false,
          hide_side_toolbar: false,
          toolbar_bg: "#0b1220",
          enable_publishing: false,
          allow_symbol_change: false,
          studies_overrides: {},
          withdateranges: true,
        });
      } catch (err) {
        // console.warn('TradingView widget init failed', err)
      }
    }

    const scriptId = "tradingview-tv-js";
    if ((window as any).TradingView) {
      createWidget();
    } else if (!document.getElementById(scriptId)) {
      const s = document.createElement("script");
      s.id = scriptId;
      s.src = "https://s3.tradingview.com/tv.js";
      s.async = true;
      s.onload = () => {
        createWidget();
      };
      document.body.appendChild(s);
    } else {
      // script present but TradingView not ready yet - try to wait
      const tryInit = () => {
        if ((window as any).TradingView) return createWidget();
        setTimeout(tryInit, 200);
      };
      tryInit();
    }

    return () => {
      // remove widget instance if possible
      try {
        if (
          widgetRef.current &&
          typeof widgetRef.current.remove === "function"
        ) {
          widgetRef.current.remove();
        }
      } catch (_) {}
      // clear DOM
      if (container && container.firstChild) {
        container.innerHTML = "";
      }
    };
  }, [symbol]);

  return (
    <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />
  );
}
