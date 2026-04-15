import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { allAssets } from "../data/homeData";
import type { Timeframe } from "../types/stock";
import type { PredictionApiPayload } from "../types/prediction";
import { getFormattedSymbol } from "../lib/utils";
import { getSupportedPredictionAsset } from "../config/supportedAssets";

import TopInfoBar from "../components/stockdetail/TopInfoBar";
import CandlestickChartSection from "../components/stockdetail/CandlestickChartSection";
import AIPredictionChart from "../components/stockdetail/AIPredictionChart";
import EntryExitCard from "../components/stockdetail/EntryExitCard";
import RiskScoreCard from "../components/stockdetail/RiskScoreCard";
import PredictionHistory from "../components/stockdetail/PredictionHistory";

const INTRADAY_TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "30m", "1h", "4h"];

const SymbolInfoWidget = memo(function SymbolInfoWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const tvSymbol = getFormattedSymbol(symbol);

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.cssText = "width:100%;";

    const inner = document.createElement("div");
    inner.className = "tradingview-widget-container__widget";
    inner.style.cssText = "width:100%;";
    wrapper.appendChild(inner);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: "100%",
      locale: "en",
      colorTheme: "dark",
      isTransparent: true,
    });
    wrapper.appendChild(script);
    containerRef.current.appendChild(wrapper);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      initialized.current = false;
    };
  }, [tvSymbol]);

  const isGold = symbol === "GOLD" || symbol === "XAUUSD";
  const isBTC = symbol.toUpperCase().includes("BTC");

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 sm:p-7 border ${
        isGold
          ? "border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20"
          : isBTC
          ? "border-orange-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20"
          : "border-blue-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/20"
      }`}
    >
      <span
        className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40 ${
          isGold ? "bg-amber-500/20" : isBTC ? "bg-orange-500/20" : "bg-blue-500/20"
        }`}
      />
      <div ref={containerRef} className="w-full relative z-10" />
    </div>
  );
});

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const sym = (symbol ?? "").toUpperCase();
  const stock = allAssets.find((s) => s.symbol === sym);
  const supported = getSupportedPredictionAsset(sym);

  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("1D");
  const [apiPayload, setApiPayload] = useState<PredictionApiPayload | null>(null);

  const activeEntryExit = apiPayload?.entry_exit_zones ?? null;
  const activeRiskMetrics = apiPayload?.risk_metrics ?? null;
  const isPredictionSupported = useMemo(() => supported !== null, [supported]);
  const isBtcSymbol = useMemo(() => sym.includes("BTC"), [sym]);

  useEffect(() => {
    if (!isBtcSymbol && INTRADAY_TIMEFRAMES.includes(activeTimeframe)) {
      setActiveTimeframe("1D");
    }
  }, [activeTimeframe, isBtcSymbol]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 px-1 sm:px-0">
      {isPredictionSupported ? (
        <SymbolInfoWidget symbol={sym} />
      ) : (
        <TopInfoBar stock={stock} sym={sym} livePrice={null} liveChangePct={null} />
      )}

      <CandlestickChartSection
        symbol={sym}
        activeTimeframe={activeTimeframe}
        onTimeframeChange={setActiveTimeframe}
      />

      {isPredictionSupported ? (
        <AIPredictionChart symbol={supported.apiSymbol} onApiData={setApiPayload} />
      ) : (
        <div className="bg-[#0b1220] border border-amber-500/30 rounded-2xl p-5 sm:p-6">
          <h3 className="text-sm font-black uppercase tracking-widest text-amber-300">
            Prediction Not Available
          </h3>
          <p className="text-xs sm:text-sm text-amber-100/90 mt-2">
            This symbol is unsupported for AI prediction. Supported symbols are BTC, Gold (XAU/USD), and EUR/USD.
          </p>
        </div>
      )}

      {isPredictionSupported && activeEntryExit && activeRiskMetrics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <EntryExitCard
            zones={activeEntryExit}
            currency={
              sym === "GOLD" || sym === "XAUUSD" || sym === "EURUSD" || sym.includes("BTC")
                ? "USD"
                : "INR"
            }
          />
          <RiskScoreCard
            metrics={activeRiskMetrics}
            marketIntelligence={apiPayload?.market_intelligence}
          />
        </div>
      ) : (
        isPredictionSupported &&
        !apiPayload && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 animate-pulse shadow-xl"
              >
                <div className="h-4 w-32 bg-slate-800 rounded mb-6" />
                <div className="h-24 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        )
      )}

      {isPredictionSupported && (
        <div id="performance-audit" className="pt-4">
          <PredictionHistory symbol={supported.apiSymbol} />
        </div>
      )}
    </div>
  );
}
