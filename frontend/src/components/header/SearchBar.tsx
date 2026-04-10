import React, { useCallback, useEffect, useRef, useState } from "react";
import type { SearchResult } from "../../types/search";
import { Link, useNavigate } from "react-router-dom";

interface Props {
  className?: string;
}

export default function SearchBar({ className = "" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number>(-1);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    const id = setTimeout(() => {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ac.signal })
        .then((r) => r.json())
        .then((data: SearchResult[]) => {
          setResults(data || []);
          setOpen(true);
          setActive(-1);
        })
        .catch((e) => {
          if (e.name === "AbortError") return;
          console.error(e);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(id);
  }, [query]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp"))
        setOpen(true);
      if (e.key === "ArrowDown")
        setActive((a) => Math.min(a + 1, results.length - 1));
      if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
      if (e.key === "Enter") {
        if (active >= 0 && results[active]) {
          navigate(`/stock/${results[active].symbol}`);
          setOpen(false);
        } else if (query.trim()) {
          navigate(`/stock/${query.trim().toUpperCase()}`);
          setOpen(false);
        }
      }
      if (e.key === "Escape") setOpen(false);
    },
    [active, navigate, query, results, open],
  );

  const highlight = (text: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <span className="bg-emerald-400/20 text-emerald-300">
          {text.substring(idx, idx + query.length)}
        </span>
        {text.substring(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="flex items-center bg-[rgba(255,255,255,0.02)] rounded-full px-3 py-2 shadow-sm">
        <svg
          className="w-5 h-5 text-slate-400 mr-2"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M21 21l-4.35-4.35"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <circle
            cx="11"
            cy="11"
            r="6"
            stroke="currentColor"
            strokeWidth={1.5}
          />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => query && setOpen(true)}
          placeholder="Search symbol, company or index"
          className="bg-transparent w-full outline-none placeholder:text-slate-400 text-slate-100"
          aria-label="Market search"
        />
        {loading && (
          <div className="w-4 h-4 border-2 border-slate-500 rounded-full animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-white/5 dark:bg-slate-800 rounded-lg shadow-lg ring-1 ring-black/20 overflow-hidden z-50 animate-fade">
          {results.map((r, i) => (
            <div
              key={r.symbol}
              className={`flex items-center justify-between px-4 py-3 hover:bg-slate-700 cursor-pointer ${i === active ? "bg-slate-700" : ""}`}
              onMouseDown={() => navigate(`/stock/${r.symbol}`)}
            >
              <div>
                <div className="font-medium text-slate-100">{r.symbol}</div>
                <div className="text-sm text-slate-400">
                  {highlight(r.name)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">₹{r.price.toFixed(2)}</div>
                <div
                  className={`text-sm ${r.change_percent >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {r.change_percent >= 0 ? "+" : ""}
                  {r.change_percent.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
