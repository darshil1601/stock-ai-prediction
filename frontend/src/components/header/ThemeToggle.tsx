import React, { useContext } from "react";
import { ThemeContext } from "../../context/ThemeContext";

export default function ThemeToggle(): JSX.Element {
  const ctx = useContext(ThemeContext);
  if (!ctx) return <></>;

  const { theme, toggle } = ctx;

  return (
    <button
      aria-label="Toggle theme"
      onClick={toggle}
      className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.03)] flex items-center justify-center hover:scale-105 transition"
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
            stroke="currentColor"
            strokeWidth={1.2}
            className="text-slate-100"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke="currentColor"
            strokeWidth={1.2}
          />
          <circle
            cx="12"
            cy="12"
            r="3"
            stroke="currentColor"
            strokeWidth={1.2}
          />
        </svg>
      )}
    </button>
  );
}
