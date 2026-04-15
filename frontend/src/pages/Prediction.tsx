import React, { useEffect, useMemo, useState } from "react";

import PredictionTable from "../components/prediction/PredictionTable";
import {
  SUPPORTED_PREDICTION_ASSETS,
} from "../config/supportedAssets";
import { api } from "../services/api";
import type { PredictionApiPayload, PredictionTableItem } from "../types/prediction";

function payloadToTableItem(payload: PredictionApiPayload): PredictionTableItem {
  const slug = payload.symbol.toUpperCase().replace("/", "");
  const mappedSymbol = slug.includes("BTC")
    ? "BTC"
    : slug.includes("EUR")
    ? "EURUSD"
    : "GOLD";
  const asset =
    SUPPORTED_PREDICTION_ASSETS.find((item) => item.symbol === mappedSymbol) ??
    SUPPORTED_PREDICTION_ASSETS[0];

  return {
    symbol: asset.symbol,
    routeSymbol: asset.routeSymbol,
    name: asset.displayName,
    market: asset.market,
    cadence: asset.cadence,
    signal: payload.signal,
    confidencePct: Math.max(0, Math.min(100, Math.round(payload.confidence * 100))),
    predictionValue: payload.prediction_value ?? payload.next_price,
    predictionTargetLabel: payload.prediction_target_label ?? "Predicted Next Close",
    predictionTargetDisplay: payload.prediction_target_display ?? payload.prediction_target_time,
    predictionDataSource: payload.prediction_data_source ?? "Twelve Data",
    riskLevel: payload.risk_metrics?.riskLevel ?? "Medium",
    accuracy: payload.accuracy ?? null,
    accuracyStatus: payload.accuracy_status ?? "not_enough_data",
    modelVersion: payload.model_version ?? null,
  };
}

export default function Prediction() {
  const [rows, setRows] = useState<PredictionTableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    Promise.all(
      SUPPORTED_PREDICTION_ASSETS.map((asset) => api.getPrediction(asset.apiSymbol))
    )
      .then((payloads: PredictionApiPayload[]) => {
        if (!alive) return;
        const mapped = payloads.map(payloadToTableItem);
        mapped.sort((a, b) => b.confidencePct - a.confidencePct);
        setRows(mapped);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (!alive) return;
        setError(err.message || "Prediction API unavailable");
        setRows([]);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const buy = rows.filter((item) => item.signal === "BUY").length;
    const sell = rows.filter((item) => item.signal === "SELL").length;
    const avgConfidence = total
      ? Math.round(rows.reduce((sum, item) => sum + item.confidencePct, 0) / total)
      : 0;
    return { total, buy, sell, avgConfidence };
  }, [rows]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-100 leading-none">
            AI Prediction Dashboard
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1.5">
            Backend predictions for BTC, Gold, and EUR/USD only.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs font-semibold text-indigo-300">MomentumNet v2</span>
          <span className="text-xs text-indigo-500/60">Live backend feed</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Tracked Assets", value: stats.total, color: "text-slate-100" },
          { label: "Buy Signals", value: stats.buy, color: "text-emerald-400" },
          { label: "Sell Signals", value: stats.sell, color: "text-rose-400" },
          { label: "Avg Confidence", value: `${stats.avgConfidence}%`, color: "text-indigo-400" },
        ].map((pill) => (
          <div
            key={pill.label}
            className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3"
          >
            <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              {pill.label}
            </div>
            <div className={`text-xl sm:text-2xl font-bold mt-1 tabular-nums ${pill.color}`}>
              {pill.value}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl sm:rounded-2xl p-8 text-center">
          <div className="text-xs sm:text-sm text-slate-400 font-semibold">Loading backend predictions...</div>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-5">
          <h2 className="text-sm font-bold text-rose-300 uppercase tracking-widest">
            Prediction Feed Error
          </h2>
          <p className="text-xs sm:text-sm text-rose-100 mt-2">
            Unable to fetch backend predictions for BTC, Gold, and EUR/USD. {error}
          </p>
        </div>
      )}

      {!loading && !error && <PredictionTable items={rows} />}
    </div>
  );
}
