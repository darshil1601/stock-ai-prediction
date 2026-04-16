"""
analyze_accuracy.py — Analyze prediction vs actual price errors from Supabase
"""
from dotenv import load_dotenv
load_dotenv()

from app.database import supabase
from app.services.asset_profile import format_prediction_target, parse_candle_timestamp, resolve_history_interval

SYMBOLS = ["XAU/USD", "EUR/USD", "BTC/USD"]

def run_analysis():
    for sym in SYMBOLS:
        resp = supabase.table("predictions") \
            .select("predicted_for,predicted_price,actual_price,signal,confidence,created_at") \
            .eq("symbol", sym) \
            .not_.is_("actual_price", "null") \
            .order("created_at", desc=True) \
            .limit(20) \
            .execute()

        data = resp.data or []
        print(f"\n{'='*75}")
        print(f"  {sym} PERFORMANCE AUDIT  |  Records: {len(data)}")
        print(f"{'='*75}")

        if not data:
            print("  No reconciled data yet.")
            continue

        total_err = []
        for r in data:
            p = float(r["predicted_price"])
            a = float(r["actual_price"])
            err_pct = abs(p - a) / a * 100
            total_err.append(err_pct)
            
            # Format target for display
            try:
                # For intraday, use created_at as base
                created_dt = parse_candle_timestamp(r["created_at"])
                interval = resolve_history_interval(sym, created_dt)
                
                # We need to estimate the target DT similarly to database.py
                # or just use predicted_for if it has time. But predicted_for is date-only in DB.
                # So we use the helper to get a nice display string.
                from datetime import timedelta
                if interval == "1day":
                    target_dt = parse_candle_timestamp(r["predicted_for"])
                else:
                    target_dt = created_dt.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
                
                display_target = format_prediction_target(sym, target_dt)
            except:
                display_target = r["predicted_for"]

            label = "PERFECT" if err_pct < 0.2 else "GOOD   " if err_pct < 0.8 else "OK     " if err_pct < 1.5 else "MISS   "
            print(f"  {label} | {display_target:<18} | pred={p:>10.2f} | actual={a:>10.2f} | err={err_pct:>5.2f}% | {r['signal']}")

        avg_err = sum(total_err) / len(total_err)
        max_err = max(total_err)
        min_err = min(total_err)
        accuracy = max(0, 100 - avg_err)

        print(f"\n  AVG ERROR : {avg_err:.3f}%")
        print(f"  MAX ERROR : {max_err:.3f}%")
        print(f"  MIN ERROR : {min_err:.3f}%")
        print(f"  ACCURACY  : {accuracy:.1f}%")

        good = sum(1 for e in total_err if e < 0.8)
        close = sum(1 for e in total_err if 0.8 <= e < 1.5)
        miss = sum(1 for e in total_err if e >= 1.5)
        print(f"\n  GOOD (<0.8%): {good}  |  CLOSE (0.8-1.5%): {close}  |  MISS (>1.5%): {miss}")

if __name__ == "__main__":
    run_analysis()
