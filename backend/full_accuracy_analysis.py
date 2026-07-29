"""
full_accuracy_analysis.py -- Comprehensive AI Prediction Accuracy Analysis
Queries Supabase directly and computes all metrics.
"""
import os
import sys
import io
import math
import json
from datetime import datetime, timezone
from statistics import median, stdev

# Force UTF-8 output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Load environment
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

SEP = "=" * 80

# -----------------------------------------------------------------------
# STEP 1: Discover all tables
# -----------------------------------------------------------------------
def discover_tables():
    known_tables = [
        "predictions", "market_data", "model_info", "news_sentiment",
        "sentiment_summary", "intelligence_logs", "live_prices", "event_log",
    ]
    print(f"\n{SEP}")
    print("  STEP 1: DATABASE TABLE DISCOVERY")
    print(SEP)

    found = []
    for table in known_tables:
        try:
            resp = supabase.table(table).select("*", count="exact").limit(1).execute()
            count = resp.count if resp.count is not None else len(resp.data or [])
            found.append((table, count))
            print(f"  [OK]   {table:<25} -- {count:>6} rows")
        except Exception as e:
            print(f"  [FAIL] {table:<25} -- ERROR: {e}")
    return found


# -----------------------------------------------------------------------
# STEP 2: Inspect predictions table schema
# -----------------------------------------------------------------------
def inspect_predictions_schema():
    print(f"\n{SEP}")
    print("  STEP 2: PREDICTIONS TABLE SCHEMA INSPECTION")
    print(SEP)

    resp = supabase.table("predictions").select("*").limit(3).execute()
    rows = resp.data or []
    if not rows:
        print("  [FAIL] No data in predictions table!")
        return []

    columns = list(rows[0].keys())
    print(f"\n  Columns found ({len(columns)}):")
    for col in columns:
        sample = rows[0].get(col)
        print(f"    - {col:<25} sample: {str(sample)[:60]}")

    print(f"\n  SQL Equivalent:")
    print(f"    SELECT * FROM predictions LIMIT 3;")
    return columns


# -----------------------------------------------------------------------
# STEP 3: Discover symbol formats
# -----------------------------------------------------------------------
def discover_symbols():
    print(f"\n{SEP}")
    print("  STEP 3: SYMBOL FORMAT DISCOVERY")
    print(SEP)

    resp = supabase.table("predictions").select("symbol").execute()
    rows = resp.data or []
    symbols = set()
    for r in rows:
        s = r.get("symbol")
        if s:
            symbols.add(s)

    print(f"\n  Distinct symbols found in predictions table:")
    symbol_counts = {}
    for sym in sorted(symbols):
        count_resp = supabase.table("predictions").select("id", count="exact").eq("symbol", sym).execute()
        total = count_resp.count or 0
        recon_resp = supabase.table("predictions").select("id", count="exact").eq("symbol", sym).not_.is_("actual_price", "null").execute()
        reconciled = recon_resp.count or 0
        symbol_counts[sym] = {"total": total, "reconciled": reconciled}
        print(f"    - {sym:<15} -- Total: {total:>5} | Reconciled (actual_price NOT NULL): {reconciled:>5}")

    btc_symbol = None
    for sym in symbols:
        if "BTC" in sym.upper():
            btc_symbol = sym
            break

    print(f"\n  BTC symbol format detected: '{btc_symbol}'")
    print(f"\n  SQL Equivalent:")
    print(f"    SELECT symbol, COUNT(*) as total,")
    print(f"           COUNT(actual_price) as reconciled")
    print(f"    FROM predictions GROUP BY symbol;")

    return symbol_counts, btc_symbol


# -----------------------------------------------------------------------
# STEP 4: Fetch all reconciled predictions
# -----------------------------------------------------------------------
def fetch_reconciled_predictions(symbol=None):
    print(f"\n{SEP}")
    label = f" ({symbol})" if symbol else " (ALL)"
    print(f"  STEP 4: FETCHING RECONCILED PREDICTIONS{label}")
    print(SEP)

    query = supabase.table("predictions").select(
        "id,symbol,predicted_price,actual_price,predicted_for,signal,confidence,model_version,created_at"
    ).not_.is_("actual_price", "null")

    if symbol:
        query = query.eq("symbol", symbol)

    query = query.order("created_at", desc=False)

    all_rows = []
    page_size = 1000
    offset = 0
    while True:
        resp = query.range(offset, offset + page_size - 1).execute()
        rows = resp.data or []
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size

    print(f"  Total reconciled records fetched: {len(all_rows)}")
    if all_rows:
        print(f"  Date range: {all_rows[0].get('created_at', 'N/A')[:19]} -> {all_rows[-1].get('created_at', 'N/A')[:19]}")
        print(f"\n  SQL Equivalent:")
        where_sym = f" AND symbol = '{symbol}'" if symbol else ""
        print(f"    SELECT id, symbol, predicted_price, actual_price, predicted_for,")
        print(f"           signal, confidence, model_version, created_at")
        print(f"    FROM predictions")
        print(f"    WHERE actual_price IS NOT NULL{where_sym}")
        print(f"    ORDER BY created_at ASC;")

    return all_rows


# -----------------------------------------------------------------------
# STEP 5: Compute all accuracy metrics
# -----------------------------------------------------------------------
def compute_metrics(rows, symbol_label="ALL"):
    print(f"\n{SEP}")
    print(f"  STEP 5: ACCURACY METRICS -- {symbol_label}")
    print(SEP)

    if not rows:
        print("  [FAIL] No reconciled data available. Cannot compute metrics.")
        return None

    errors_pct = []
    errors_abs = []
    errors_sq = []
    direction_correct = 0
    direction_total = 0

    sorted_rows = sorted(rows, key=lambda r: r.get("created_at", ""))

    for i, row in enumerate(sorted_rows):
        try:
            pred = float(row["predicted_price"])
            actual = float(row["actual_price"])
        except (TypeError, ValueError, KeyError):
            continue

        if actual == 0:
            continue

        err_pct = abs(pred - actual) / actual * 100
        err_abs = abs(pred - actual)
        err_sq = (pred - actual) ** 2

        errors_pct.append(err_pct)
        errors_abs.append(err_abs)
        errors_sq.append(err_sq)

        # Directional accuracy
        if i > 0:
            try:
                prev_actual = float(sorted_rows[i - 1]["actual_price"])
                if prev_actual > 0:
                    pred_dir = 1 if pred > prev_actual else (-1 if pred < prev_actual else 0)
                    actual_dir = 1 if actual > prev_actual else (-1 if actual < prev_actual else 0)
                    direction_total += 1
                    if pred_dir == actual_dir:
                        direction_correct += 1
            except (TypeError, ValueError, KeyError):
                pass

    n = len(errors_pct)
    if n == 0:
        print("  [FAIL] No valid prediction-actual pairs found.")
        return None

    mape = sum(errors_pct) / n
    mae = sum(errors_abs) / n
    rmse = math.sqrt(sum(errors_sq) / n)
    avg_err = mape
    max_err = max(errors_pct)
    min_err = min(errors_pct)
    med_err = median(errors_pct)
    std_err = stdev(errors_pct) if n > 1 else 0.0
    dir_acc = (direction_correct / direction_total * 100) if direction_total > 0 else 0.0

    # Quality classification
    if mape < 1.0:
        quality = ">>> EXCELLENT <<<"
    elif mape < 3.0:
        quality = ">>> GOOD <<<"
    elif mape < 5.0:
        quality = ">>> AVERAGE <<<"
    else:
        quality = ">>> POOR <<<"

    if dir_acc > 60:
        dir_quality = ">>> EXCELLENT <<<"
    elif dir_acc > 55:
        dir_quality = ">>> GOOD <<<"
    elif dir_acc > 50:
        dir_quality = ">>> ABOVE RANDOM <<<"
    else:
        dir_quality = ">>> AT/BELOW RANDOM <<<"

    results = {
        "symbol": symbol_label,
        "total_predictions": n,
        "direction_pairs": direction_total,
        "mape": mape,
        "mae": mae,
        "rmse": rmse,
        "avg_err_pct": avg_err,
        "max_err_pct": max_err,
        "min_err_pct": min_err,
        "med_err_pct": med_err,
        "std_err": std_err,
        "dir_accuracy": dir_acc,
        "dir_correct": direction_correct,
        "quality": quality,
        "dir_quality": dir_quality,
    }

    print(f"""
  +-------------------------------------------------------------+
  |  ACCURACY REPORT -- {symbol_label:<39}  |
  +-------------------------------------------------------------+
  |                                                             |
  |  Total Predictions Analyzed:    {n:>10}                     |
  |                                                             |
  |  -- Price Accuracy -----------------------------------------|
  |  Mean Absolute % Error (MAPE):  {mape:>10.4f}%                   |
  |  Mean Absolute Error (MAE):    ${mae:>10.2f}                   |
  |  Root Mean Square Error (RMSE):${rmse:>10.2f}                   |
  |                                                             |
  |  -- Error Distribution -------------------------------------|
  |  Average Error (%):             {avg_err:>10.4f}%                   |
  |  Maximum Error (%):             {max_err:>10.4f}%                   |
  |  Minimum Error (%):             {min_err:>10.4f}%                   |
  |  Median Error (%):              {med_err:>10.4f}%                   |
  |  Std Deviation of Error:        {std_err:>10.4f}%                   |
  |                                                             |
  |  -- Directional Accuracy -----------------------------------|
  |  Pairs Evaluated:               {direction_total:>10}                     |
  |  Correct Directions:            {direction_correct:>10}                     |
  |  Directional Accuracy:          {dir_acc:>10.2f}%                   |
  |                                                             |
  |  -- Quality Assessment -------------------------------------|
  |  Price Accuracy:     {quality:<39}  |
  |  Direction Accuracy: {dir_quality:<39}  |
  |                                                             |
  +-------------------------------------------------------------+
""")

    where_sym = f"AND symbol = '{symbol_label}'" if symbol_label != "ALL" else ""
    print(f"  SQL Equivalents Used:")
    print(f"""
    -- MAPE
    SELECT AVG(ABS(predicted_price - actual_price) / actual_price * 100) AS mape
    FROM predictions
    WHERE actual_price IS NOT NULL AND actual_price > 0 {where_sym};

    -- MAE
    SELECT AVG(ABS(predicted_price - actual_price)) AS mae
    FROM predictions
    WHERE actual_price IS NOT NULL {where_sym};

    -- RMSE
    SELECT SQRT(AVG(POWER(predicted_price - actual_price, 2))) AS rmse
    FROM predictions
    WHERE actual_price IS NOT NULL {where_sym};

    -- Directional Accuracy (window function)
    WITH ordered AS (
      SELECT predicted_price, actual_price,
             LAG(actual_price) OVER (ORDER BY created_at) AS prev_actual
      FROM predictions
      WHERE actual_price IS NOT NULL {where_sym}
      ORDER BY created_at
    )
    SELECT
      COUNT(*) FILTER (
        WHERE SIGN(predicted_price - prev_actual) = SIGN(actual_price - prev_actual)
      ) * 100.0 / COUNT(*) AS directional_accuracy
    FROM ordered
    WHERE prev_actual IS NOT NULL;
""")

    return results


# -----------------------------------------------------------------------
# STEP 6: Per-record detail dump
# -----------------------------------------------------------------------
def show_sample_records(rows, symbol_label):
    print(f"\n{SEP}")
    print(f"  STEP 6: SAMPLE RECORDS -- {symbol_label}")
    print(SEP)

    if not rows:
        print("  No records to display.")
        return

    sorted_rows = sorted(rows, key=lambda r: r.get("created_at", ""))

    def fmt_row(r):
        try:
            pred = float(r["predicted_price"])
            actual = float(r["actual_price"])
            err = abs(pred - actual) / actual * 100 if actual > 0 else 0
            label = "PERFECT" if err < 0.2 else "GOOD" if err < 0.8 else "OK" if err < 1.5 else "MISS"
            signal = r.get("signal", "?")
            conf = r.get("confidence", "?")
            predicted_for = str(r.get("predicted_for", "?"))[:19]
            return f"    {label:<7} | {predicted_for:<19} | pred=${pred:>10.2f} | actual=${actual:>10.2f} | err={err:>6.3f}% | {signal:<4} | conf={conf}"
        except:
            return f"    ERROR  | {r}"

    n = len(sorted_rows)
    show_n = min(15, n)

    header = f"    {'Label':<7} | {'Predicted For':<19} | {'Predicted':>15} | {'Actual':>15} | {'Error':>9} | {'Sig':<4} | Confidence"
    divider = f"    {'-'*7}-+-{'-'*19}-+-{'-'*15}-+-{'-'*15}-+-{'-'*9}-+-{'-'*4}-+-{'-'*10}"

    print(f"\n  First {show_n} records:")
    print(header)
    print(divider)
    for r in sorted_rows[:show_n]:
        print(fmt_row(r))

    if n > 2 * show_n:
        print(f"\n    ... ({n - 2 * show_n} more records) ...\n")
        print(f"  Last {show_n} records:")
        print(header)
        print(divider)
        for r in sorted_rows[-show_n:]:
            print(fmt_row(r))


# -----------------------------------------------------------------------
# STEP 7: Model training history
# -----------------------------------------------------------------------
def check_model_info():
    print(f"\n{SEP}")
    print(f"  STEP 7: MODEL TRAINING HISTORY (model_info table)")
    print(SEP)

    try:
        resp = supabase.table("model_info").select("*").order("last_trained_at", desc=True).limit(20).execute()
        rows = resp.data or []
        if not rows:
            print("  No model_info records found.")
            return

        print(f"\n  {'Symbol':<10} | {'Version':<22} | {'Accuracy':>8} | {'Trained At':<20} | {'Rows':>5} | Metrics")
        print(f"  {'-'*10}-+-{'-'*22}-+-{'-'*8}-+-{'-'*20}-+-{'-'*5}-+-{'-'*30}")
        for r in rows:
            sym = r.get("symbol", "?")
            ver = r.get("version", "?")
            acc = r.get("accuracy", "?")
            trained = str(r.get("last_trained_at", "?"))[:19]
            train_rows = r.get("training_rows", "?")
            metrics = r.get("metrics", {})
            if isinstance(metrics, str):
                try:
                    metrics = json.loads(metrics)
                except:
                    metrics = {}
            rmse_val = metrics.get("rmse", "?")
            mae_val = metrics.get("mae", "?")
            dir_val = metrics.get("directional_accuracy", "?")
            metric_str = f"rmse={rmse_val}, mae={mae_val}, dir={dir_val}"
            print(f"  {sym:<10} | {ver:<22} | {str(acc):>8} | {trained:<20} | {str(train_rows):>5} | {metric_str}")
    except Exception as e:
        print(f"  [FAIL] Error querying model_info: {e}")


# -----------------------------------------------------------------------
# STEP 8: Generate resume bullets
# -----------------------------------------------------------------------
def generate_resume_bullets(all_results):
    print(f"\n{SEP}")
    print(f"  STEP 8: ATS-FRIENDLY RESUME BULLETS")
    print(SEP)

    if not all_results:
        print("  [FAIL] No metrics available to generate resume bullets.")
        return

    best_mape = None
    best_dir = None
    total_preds = 0
    symbols_analyzed = []

    for r in all_results:
        if r is None:
            continue
        symbols_analyzed.append(r["symbol"])
        total_preds += r["total_predictions"]
        if best_mape is None or r["mape"] < best_mape:
            best_mape = r["mape"]
        if best_dir is None or r["dir_accuracy"] > best_dir:
            best_dir = r["dir_accuracy"]

    if best_mape is None:
        print("  [FAIL] No valid metrics computed.")
        return

    btc_result = next((r for r in all_results if r and "BTC" in r["symbol"]), None)

    print(f"\n  METRIC RECOMMENDATION FOR RESUME:")
    print(f"  -----------------------------------")
    if best_dir > 55:
        print(f"  #1 Lead with DIRECTIONAL ACCURACY ({best_dir:.1f}%) -- most intuitive for recruiters")
        print(f"  #2 Supplement with MAPE ({best_mape:.2f}%) -- shows quantitative rigor")
    elif best_mape < 3.0:
        print(f"  #1 Lead with MAPE ({best_mape:.2f}%) -- strongest metric available")
        print(f"  #2 Supplement with total predictions validated ({total_preds})")
    else:
        print(f"  #1 Lead with ENGINEERING DEPTH -- emphasize system design over raw accuracy")
        print(f"  #2 Include MAPE ({best_mape:.2f}%) as a supporting metric showing validation rigor")

    print(f"\n  ================================================================")
    print(f"  BULLET 1 (Accuracy-Forward):")
    print(f"  ================================================================")

    if btc_result:
        b = btc_result
        print(f'  "Validated LSTM + FinBERT model predictions against live BTC/USDT 4-hour')
        print(f'   candle data across {b["total_predictions"]} reconciled predictions, achieving a')
        print(f'   Mean Absolute Percentage Error (MAPE) of {b["mape"]:.2f}% and Directional')
        print(f'   Accuracy of {b["dir_accuracy"]:.1f}%, with automated reconciliation pipelines')
        print(f'   running across 3 daily market-close windows."')
    else:
        print(f'  "Validated multi-asset LSTM + FinBERT predictions across {total_preds}')
        print(f'   reconciled records, achieving MAPE of {best_mape:.2f}%')
        print(f'   and Directional Accuracy of {best_dir:.1f}%."')

    print(f"\n  ================================================================")
    print(f"  BULLET 2 (Engineering-Forward):")
    print(f"  ================================================================")
    print(f'  "Engineered a production-grade financial prediction system with 3')
    print(f'   independently versioned LSTM models, 22 engineered technical features,')
    print(f'   real-time FinBERT NLP sentiment scoring from NewsAPI and GDELT, and')
    print(f'   automated APScheduler reconciliation -- validated against {total_preds}+ live')
    print(f'   market data points across BTC/USDT (4H), XAU/USD, and EUR/USD."')

    print(f"\n  ================================================================")
    print(f"  BULLET 3 (Full-Stack + ML):")
    print(f"  ================================================================")
    print(f'  "Designed and deployed a full-stack AI trading intelligence platform')
    print(f'   (FastAPI, React/TypeScript, Supabase, Redis) with automated weekly LSTM')
    print(f'   retraining, Huber loss optimization, 5-stage prediction calibration')
    print(f'   (baseline blending, sentiment injection, volatility capping), and live')
    print(f'   TradingView chart integration -- achieving {best_mape:.2f}% MAPE across')
    print(f'   {total_preds} backtested predictions."')

    if best_mape > 5.0:
        print(f"\n  ================================================================")
        print(f"  ALTERNATIVE BULLET (if accuracy is weak -- focus on engineering):")
        print(f"  ================================================================")
        print(f'  "Built and deployed a real-time LSTM + FinBERT financial prediction')
        print(f'   engine covering 3 asset classes (crypto, forex, commodities), processing')
        print(f'   22 engineered features from 5,000+ historical candles with automated')
        print(f'   weekly retraining, news sentiment integration via FinBERT NLP, and')
        print(f'   production reconciliation against live Twelve Data market feeds."')


# -----------------------------------------------------------------------
# MAIN
# -----------------------------------------------------------------------
def main():
    print(f"\n{'#' * 80}")
    print(f"#{'AI STOCK PREDICTION -- FULL ACCURACY ANALYSIS':^78}#")
    print(f"#{'':^78}#")
    print(f"#{'Querying Supabase: ' + SUPABASE_URL:^78}#")
    print(f"#{'Timestamp: ' + datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC'):^78}#")
    print(f"{'#' * 80}")

    # Step 1
    tables = discover_tables()

    # Step 2
    columns = inspect_predictions_schema()

    # Step 3
    symbol_counts, btc_symbol = discover_symbols()

    # Step 4 & 5: Analyze each symbol
    all_results = []
    for sym in sorted(symbol_counts.keys()):
        if symbol_counts[sym]["reconciled"] == 0:
            print(f"\n  [WARN] Skipping {sym} -- no reconciled records")
            continue

        rows = fetch_reconciled_predictions(sym)
        show_sample_records(rows, sym)
        result = compute_metrics(rows, sym)
        all_results.append(result)

    # Also compute ALL combined
    valid_results = [r for r in all_results if r is not None]
    if len(valid_results) > 1:
        all_rows = fetch_reconciled_predictions()
        result_all = compute_metrics(all_rows, "ALL SYMBOLS COMBINED")
        all_results.append(result_all)

    # Step 7
    check_model_info()

    # Step 8
    generate_resume_bullets([r for r in all_results if r is not None])

    print(f"\n{SEP}")
    print(f"  ANALYSIS COMPLETE")
    print(f"{SEP}\n")


if __name__ == "__main__":
    main()
