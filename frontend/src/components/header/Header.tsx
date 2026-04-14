import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import ProfileDropdown from "./ProfileDropdown";

const NAV_ITEMS = [
  { to: "/markets", label: "Markets" },
  { to: "/prediction", label: "AI Prediction" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/screener", label: "Screener" },
];

export default function Header(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center h-14 sm:h-16 gap-2 sm:gap-4">

          {/* ── Mobile hamburger ── */}
          <button
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((s) => !s)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg
                       bg-white/[0.03] hover:bg-white/[0.06] transition-colors flex-shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M4 7h16" strokeLinecap="round" />
                  <path d="M4 12h16" strokeLinecap="round" />
                  <path d="M4 17h16" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>

          {/* ── Logo ── */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/" className="flex flex-col leading-none">
              <span className="text-base sm:text-lg font-extrabold text-white">StockAI</span>
              <span className="text-[10px] sm:text-xs text-slate-400 hidden xs:block">
                AI Powered Market Intelligence
              </span>
            </Link>
          </div>

          {/* ── Search (grows to fill space) ── */}
          <div className="flex-1 min-w-0">
            <SearchBar />
          </div>

          {/* ── Desktop nav links ── */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 ml-2 flex-shrink-0">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-2.5 lg:px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                    isActive
                      ? "bg-emerald-600/90 text-white shadow-lg shadow-emerald-600/20"
                      : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* ── Right actions ── */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 ml-1 sm:ml-2 flex-shrink-0">
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </div>
      </div>

      {/* ── Mobile slide-out nav ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 top-14 sm:top-16 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          {/* Menu panel */}
          <nav className="fixed left-0 right-0 top-14 sm:top-16 z-50 md:hidden
                          bg-slate-900/98 border-b border-slate-800
                          animate-fade shadow-2xl shadow-black/40 max-h-[calc(100vh-3.5rem)]
                          overflow-y-auto">
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-3 rounded-xl text-base font-semibold transition-colors duration-150 ${
                      isActive
                        ? "bg-emerald-600/90 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
