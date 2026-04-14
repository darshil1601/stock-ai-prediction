import React, { memo } from "react";

type TabKey = "All" | "Stocks" | "Commodities" | "Crypto";

const TABS: TabKey[] = ["All", "Stocks", "Commodities", "Crypto"];

export default memo(function CategoryTabs({
  selected,
  onChange,
}: {
  selected: TabKey;
  onChange: (t: TabKey) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 p-1 bg-slate-800/60 border border-slate-700/50
                    rounded-xl overflow-x-auto scrollbar-none w-full sm:w-fit">
      {TABS.map((t) => {
        const active = t === selected;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`
              relative px-3 sm:px-4 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 outline-none whitespace-nowrap flex-shrink-0
              ${
                active
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }
            `}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
});
