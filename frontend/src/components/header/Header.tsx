import React from "react";
import { Link, NavLink } from "react-router-dom";
import SearchBar from "./SearchBar";
import ThemeToggle from "./ThemeToggle";
import ProfileDropdown from "./ProfileDropdown";

export default function Header(): JSX.Element {
  return (
    <header className="sticky top-0 z-50 bg-slate-900 dark:bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex flex-col leading-none">
              <span className="text-lg font-extrabold text-white">StockAI</span>
              <span className="text-xs text-slate-400">
                AI Powered Market Intelligence
              </span>
            </Link>
          </div>

          <div className="flex-1">
            <SearchBar />
          </div>

          <nav className="hidden md:flex items-center gap-2 ml-4">
            <NavLink
              to="/markets"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm ${isActive ? "bg-emerald-700 text-white" : "text-slate-300 hover:bg-slate-800"}`
              }
            >
              Markets
            </NavLink>
            <NavLink
              to="/prediction"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm ${isActive ? "bg-emerald-700 text-white" : "text-slate-300 hover:bg-slate-800"}`
              }
            >
              AI Prediction
            </NavLink>
            <NavLink
              to="/portfolio"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm ${isActive ? "bg-emerald-700 text-white" : "text-slate-300 hover:bg-slate-800"}`
              }
            >
              Portfolio
            </NavLink>
            <NavLink
              to="/screener"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm ${isActive ? "bg-emerald-700 text-white" : "text-slate-300 hover:bg-slate-800"}`
              }
            >
              Screener
            </NavLink>
          </nav>

          <div className="flex items-center gap-3 ml-4">
            <ThemeToggle />
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  );
}
