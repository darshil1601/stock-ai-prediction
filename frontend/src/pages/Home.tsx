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
    <section aria-label="Hero" className="pt-4 pb-8 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full
        bg-emerald-500/10 border border-emerald-500/20 text-emerald-400
        text-xs font-semibold tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        POWERED BY PROPRIETARY AI SIGNALS
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 leading-tight tracking-tight max-w-3xl mx-auto">
        AI Stock Momentum
        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
          Prediction Engine
        </span>
      </h1>

      <p className="mt-4 text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
        Analyse market momentum with high-conviction AI signals, interactive charts,
        and real-time sentiment across Stocks, Commodities &amp; Crypto.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate("/prediction")}
          className="
            px-6 py-2.5 rounded-xl text-sm font-semibold text-white
            bg-gradient-to-r from-emerald-500 to-teal-500
            hover:from-emerald-400 hover:to-teal-400
            shadow-lg shadow-emerald-500/20
            transition-all duration-200 hover:-translate-y-0.5
          "
        >
          Run AI Prediction
        </button>
        <button
          onClick={() => navigate("/screener")}
          className="
            px-6 py-2.5 rounded-xl text-sm font-semibold
            text-slate-300 bg-slate-800/70 border border-slate-700/60
            hover:bg-slate-700/70 hover:text-slate-100
            transition-all duration-200 hover:-translate-y-0.5
          "
        >
          Open Screener
        </button>
      </div>
    </section>
  );
});

const Divider = () => <hr className="border-slate-800/60" />;

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
    <div className="space-y-10 pb-12">
      <Hero />
      <Divider />
      <MarketOverviewCards />
      <Divider />
      <AISentimentCard />
      <Divider />
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CategoryTabs selected={selected} onChange={setSelected} />
        </div>
        <TopMovers gainers={topGainers} losers={topLosers} />
      </div>
      <Divider />
      <FeaturedAIPicks />
    </div>
  );
}
