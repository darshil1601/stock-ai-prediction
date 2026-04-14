import React, { useMemo, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import CategoryTabs from "../components/CategoryTabs";
import MarketOverviewCards from "../components/home/MarketOverviewCards";
import AISentimentCard from "../components/home/AISentimentCard";
import TopMovers from "../components/home/TopMovers";
import FeaturedAIPicks from "../components/home/FeaturedAIPicks";
import { assets } from "../data/homeData";
import type { Asset } from "../types/stock";

type TabKey = "All" | "Stocks" | "Commodities" | "Crypto";

// ── Hero ──────────────────────────────────────────────────────────────────────
const Hero = memo(function Hero() {
  const navigate = useNavigate();
  return (
    <section aria-label="Hero" className="pt-2 sm:pt-4 pb-6 sm:pb-8 text-center px-2">
      <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 sm:mb-5 rounded-full
        bg-emerald-500/10 border border-emerald-500/20 text-emerald-400
        text-[10px] sm:text-xs font-semibold tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        POWERED BY PROPRIETARY AI SIGNALS
      </div>

      <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-100 leading-tight tracking-tight max-w-3xl mx-auto">
        AI Stock Momentum
        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
          Prediction Engine
        </span>
      </h1>

      <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed px-4">
        Analyse market momentum with high-conviction AI signals, interactive charts,
        and real-time sentiment across Stocks, Commodities &amp; Crypto.
      </p>

      <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 px-4">
        <button
          onClick={() => navigate("/prediction")}
          className="
            w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold text-white
            bg-gradient-to-r from-emerald-500 to-teal-500
            hover:from-emerald-400 hover:to-teal-400
            shadow-lg shadow-emerald-500/20
            transition-all duration-200 hover:-translate-y-0.5 active:scale-95
          "
        >
          Run AI Prediction
        </button>
        <button
          onClick={() => navigate("/screener")}
          className="
            w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-semibold
            text-slate-300 bg-slate-800/70 border border-slate-700/60
            hover:bg-slate-700/70 hover:text-slate-100
            transition-all duration-200 hover:-translate-y-0.5 active:scale-95
          "
        >
          Open Screener
        </button>
      </div>
    </section>
  );
});

const Divider = () => <hr className="border-slate-800/60 mx-2 sm:mx-0" />;

// ── Home page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [selected, setSelected] = useState<TabKey>("All");

  const filteredAssets: Asset[] = useMemo(() => {
    if (selected === "All") return assets;
    if (selected === "Stocks") return assets.filter((a) => a.category === "Stock");
    if (selected === "Commodities") return assets.filter((a) => a.category === "Commodity");
    return assets.filter((a) => a.category === "Crypto");
  }, [selected]);

  const topGainers = useMemo(
    () => filteredAssets.filter((a) => a.change > 0).sort((a, b) => b.change - a.change).slice(0, 5),
    [filteredAssets]
  );

  const topLosers = useMemo(
    () => filteredAssets.filter((a) => a.change < 0).sort((a, b) => a.change - b.change).slice(0, 5),
    [filteredAssets]
  );

  return (
    <div className="space-y-8 sm:space-y-12 pb-12 overflow-x-hidden">
      <Hero />
      <div className="px-2 sm:px-0">
        <Divider />
      </div>
      <div className="px-2 sm:px-0">
        <MarketOverviewCards />
      </div>
      <div className="px-2 sm:px-0">
        <Divider />
      </div>
      <div className="px-2 sm:px-0">
        <AISentimentCard />
      </div>
      <div className="px-2 sm:px-0">
        <Divider />
      </div>
      <div className="space-y-6 px-2 sm:px-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CategoryTabs selected={selected} onChange={setSelected} />
        </div>
        <TopMovers gainers={topGainers} losers={topLosers} />
      </div>
      <div className="px-2 sm:px-0">
        <Divider />
      </div>
      <div className="px-2 sm:px-0 pb-4">
        <FeaturedAIPicks />
      </div>
    </div>
  );
}
