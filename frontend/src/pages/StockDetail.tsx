import React, { useEffect, useState, useMemo, useRef, memo } from "react";
import { useParams } from "react-router-dom";

import { allAssets } from "../data/homeData";
import type { Timeframe, EntryExitZones, RiskMetrics, MarketIntelligence } from "../types/stock";

import TopInfoBar from "../components/stockdetail/TopInfoBar";
import CandlestickChartSection from "../components/stockdetail/CandlestickChartSection";
import AIPredictionChart from "../components/stockdetail/AIPredictionChart";
import EntryExitCard from "../components/stockdetail/EntryExitCard";
import RiskScoreCard from "../components/stockdetail/RiskScoreCard";
import PredictionHistory from "../components/stockdetail/PredictionHistory";
import { getFormattedSymbol } from "../lib/utils";

// ── API Payload type — mirrors backend response ───────────────────────────────
interface PredictionPayload {
  symbol: string;
  next_price: number;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  accuracy: number;
  model: string;
  generated_at: string;
  entry_exit_zones: EntryExitZones;
  risk_metrics: RiskMetrics;
  market_intelligence?: MarketIntelligence;
  predicted: { date: string; price: number }[];
  historical: { date: string; price: number }[];
}

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
      if (containerRef.current) containerRef.current.innerHTML = "";
      initialized.current = false;
    };
  }, [tvSymbol]);

  const isGold = symbol === "GOLD" || symbol === "XAUUSD";
  const isBTC  = symbol.toUpperCase().includes("BTC");

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-5 sm:p-7 border
        ${isGold 
          ? "border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20" 
          : isBTC
            ? "border-orange-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20"
            : "border-blue-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/20"
        }
      `}
    >
      <span
        className={`
          absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-40
          ${isGold ? "bg-amber-500/20" : isBTC ? "bg-orange-500/20" : "bg-blue-500/20"}
        `}
      />
      <div ref={containerRef} className="w-full relative z-10" />
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const sym = (symbol ?? "").toUpperCase();
  const stock = allAssets.find((s) => s.symbol === sym);

  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("1D");
  const [apiPayload, setApiPayload] = useState<PredictionPayload | null>(null);

  const activeEntryExit = apiPayload?.entry_exit_zones ?? null;
  const activeRiskMetrics = apiPayload?.risk_metrics ?? null;

  const isSupportedAsset = useMemo(() => {
    const s = sym.toLowerCase();
    return s.includes("gold") || s.includes("eurusd") || s.includes("btc") || s.includes("xauusd");
  }, [sym]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 px-1 sm:px-0">

      {/* ① Header */}
      {isSupportedAsset ? (
        <SymbolInfoWidget symbol={sym} />
      ) : (
        <TopInfoBar
          stock={stock}
          sym={sym}
          livePrice={null}
          liveChangePct={null}
        />
      )}

      {/* ② Candlestick Chart */}
      <CandlestickChartSection
        symbol={sym}
        activeTimeframe={activeTimeframe}
        onTimeframeChange={setActiveTimeframe}
      />

      {/* ③ AI Prediction */}
      <AIPredictionChart
        symbol={sym}
        onApiData={setApiPayload}
      />

      {/* ④ Entry/Exit + Risk */}
      {activeEntryExit && activeRiskMetrics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <EntryExitCard
            zones={activeEntryExit}
            currency={(sym === "GOLD" || sym === "XAUUSD" || sym === "EURUSD" || sym.includes("BTC")) ? "USD" : "INR"}
          />
          <RiskScoreCard
            metrics={activeRiskMetrics}
            marketIntelligence={apiPayload?.market_intelligence}
          />
        </div>
      ) : (
        !apiPayload && isSupportedAsset && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 animate-pulse shadow-xl">
                <div className="h-4 w-32 bg-slate-800 rounded mb-6" />
                <div className="h-24 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        )
      )}

      {/* ⑤ Audit History */}
      {isSupportedAsset && (
        <div id="performance-audit" className="pt-4">
          <PredictionHistory symbol={sym} />
        </div>
      )}

    </div>
  );
}
