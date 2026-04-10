import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMarketStatus } from "../lib/utils";

export default function Navbar(): JSX.Element {
  const status = getMarketStatus();
  const [query, setQuery] = useState<string>("");
  const navigate = useNavigate();

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const symbol = query.trim().toUpperCase();
    if (symbol) navigate(`/stock/${symbol}`);
  }

  return (
    <header className="sticky top-0 z-50 bg-[#0f172a] border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">
          {/* Left: Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link
              to="/"
              className="text-xl font-semibold text-slate-100 hover:opacity-90"
            >
              Stock AI Predictor
            </Link>
          </div>

          {/* Center: Search (responsive) */}
          <div className="flex-1 flex justify-center">
            <div className="w-full max-w-md md:max-w-lg">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search symbol e.g. TCS, BTC, GOLD"
                aria-label="Search symbol"
                className="w-full px-4 py-2 rounded-full bg-[rgba(255,255,255,0.03)] border border-transparent placeholder:text-slate-400 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
              />
            </div>
          </div>

          {/* Right: Status, Theme, Profile */}
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                status === "Open"
                  ? "bg-emerald-600 text-emerald-50"
                  : "bg-rose-600 text-rose-50"
              }`}
            >
              {status}
            </span>

            <button
              aria-label="Toggle theme"
              className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.03)] flex items-center justify-center hover:scale-105 transition"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </button>

            <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center text-slate-200">
              P
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
