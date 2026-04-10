import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

export default function ProfileDropdown(): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.03)] flex items-center justify-center text-slate-200"
        aria-haspopup
        aria-expanded={open}
      >
        <span className="font-medium">P</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white/5 backdrop-blur-sm rounded-lg shadow-lg py-2 z-50 ring-1 ring-black/20 dark:bg-slate-800">
          <Link
            to="/login"
            className="block px-4 py-2 text-sm hover:bg-slate-700"
          >
            Login
          </Link>
          <Link
            to="/saved"
            className="block px-4 py-2 text-sm hover:bg-slate-700"
          >
            Saved Stocks
          </Link>
          <Link
            to="/settings"
            className="block px-4 py-2 text-sm hover:bg-slate-700"
          >
            Settings
          </Link>
          <button className="w-full text-left px-4 py-2 text-sm hover:bg-slate-700">
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
