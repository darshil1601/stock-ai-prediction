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

  const isGold = symbol === "GOLD";
  const isBTC  = symbol === "BTC";

  return (
    <div
      style={{
        background: isGold
          ? "linear-gradient(135deg, rgba(17,25,46,0.98) 0%, rgba(11,16,32,1) 70%, rgba(28,22,8,0.5) 100%)"
          : isBTC
          ? "linear-gradient(135deg, rgba(17,25,46,0.98) 0%, rgba(11,16,32,1) 70%, rgba(30,18,6,0.5) 100%)"
          : "linear-gradient(135deg, rgba(17,25,46,0.98) 0%, rgba(11,16,32,1) 70%, rgba(15,23,42,0.8) 100%)",
        border: isGold
          ? "1px solid rgba(245,158,11,0.14)"
          : isBTC
          ? "1px solid rgba(249,115,22,0.18)"
          : "1px solid rgba(59,130,246,0.14)",
        borderRadius: 16,
        padding: "22px 28px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: isGold
            ? "radial-gradient(circle, rgba(251,191,36,0.09) 0%, transparent 70%)"
            : isBTC
            ? "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div ref={containerRef} style={{ width: "100%" }} />
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const sym = (symbol ?? "").toUpperCase();
  const stock = allAssets.find((s) => s.symbol === sym);

  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>("1D");
  // Typed payload — no more `any`. Set by AIPredictionChart when API responds.
  const [apiPayload, setApiPayload] = useState<PredictionPayload | null>(null);

  // Use API data if available; show nothing (or a loading state) if not.
  // We deliberately do NOT show dummy/generated data for financial information.
  const activeEntryExit = apiPayload?.entry_exit_zones ?? null;
  const activeRiskMetrics = apiPayload?.risk_metrics ?? null;

  const isSupportedAsset = useMemo(() => {
    const s = sym.toLowerCase();
    return s.includes("gold") || s.includes("eurusd") || s.includes("btc") || s.includes("xauusd");
  }, [sym]);

  return (
    <div className="space-y-5 pb-8">

      {/* ① Header — GOLD/EURUSD/BTC variants get realtime TradingView Symbol Info widget */}
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

      {/* ④ Entry/Exit + Risk — only shown when live API data is available */}
      {activeEntryExit && activeRiskMetrics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
        // Loading/error state — never show fake financial data
        !apiPayload && isSupportedAsset && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[0, 1].map((i) => (
              <div key={i} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 animate-pulse">
                <div className="h-4 w-32 bg-white/5 rounded mb-4" />
                <div className="h-20 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        )
      )}

      {/* ⑤ Audit History */}
      {isSupportedAsset && (
        <div id="performance-audit">
          <PredictionHistory symbol={sym} />
        </div>
      )}

    </div>
  );
}
