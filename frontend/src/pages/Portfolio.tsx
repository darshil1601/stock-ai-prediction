import React from "react";

export default function Portfolio() {
  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 tracking-widest uppercase">
            User Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 mt-2 tracking-tight">Active Portfolio</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">Real-time performance tracking and asset allocation.</p>
        </div>
        <div className="flex items-center gap-3">
             <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all">
                Connect Wallet
             </button>
        </div>
      </header>

      {/* Placeholder Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2 space-y-6">
            <div className="bg-[#0b1220] border border-slate-800 rounded-3xl p-10 sm:p-20 flex flex-col items-center justify-center text-center gap-4 shadow-2xl">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>
                <h3 className="text-lg font-black text-slate-100 uppercase tracking-widest">Portfolio Locked</h3>
                <p className="text-sm text-slate-500 max-w-sm font-medium leading-relaxed">
                   Synchronize your institutional account or exchange keys to unlock real-time P&L tracking and AI-driven rebalancing.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                    {["Zerodha", "Groww", "Upstox", "Binance"].map(ex => (
                        <span key={ex} className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-black text-slate-600 uppercase tracking-tighter">{ex}</span>
                    ))}
                </div>
            </div>
         </div>

         <div className="space-y-6">
             <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-3xl p-6 sm:p-8">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Risk Exposure</h4>
                <div className="space-y-4">
                    {[
                        { label: "Equities", val: 65, color: "bg-indigo-500" },
                        { label: "Commodities", val: 15, color: "bg-amber-500" },
                        { label: "Crypto", val: 20, color: "bg-emerald-500" }
                    ].map(item => (
                        <div key={item.label} className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                                <span>{item.label}</span>
                                <span>{item.val}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.val}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
             </div>
             
             <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Weekly Performance</h4>
                <div className="h-24 flex items-end justify-between gap-1">
                    {[40, 70, 45, 90, 65, 85, 55].map((h, i) => (
                        <div key={i} className="flex-1 bg-indigo-500/20 hover:bg-indigo-500/40 transition-colors rounded-t-sm" style={{ height: `${h}%` }} />
                    ))}
                </div>
             </div>
         </div>
      </div>
    </div>
  );
}
