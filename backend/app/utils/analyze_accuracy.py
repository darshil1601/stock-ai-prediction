"""
analyze_accuracy.py — Analyze prediction vs actual price errors from Supabase
"""
from dotenv import load_dotenv
load_dotenv()

from app.database import supabase

SYMBOLS = ["XAU/USD", "EUR/USD", "BTC/USD"]

def run_analysis():
    for sym in SYMBOLS:
        resp = supabase.table("predictions") \
            .select("predicted_for,predicted_price,actual_price,signal,confidence") \
            .eq("symbol", sym) \
            .not_.is_("actual_price", "null") \
            .order("predicted_for", desc=True) \
            .limit(20) \
            .execute()

        data = resp.data or []
        print(f"\n{'='*60}")
        print(f"  {sym}  |  Records with actual_price: {len(data)}")
        print(f"{'='*60}")

        if not data:
            print("  No reconciled data yet.")
            continue

        total_err = []
        for r in data:
            p = float(r["predicted_price"])
            a = float(r["actual_price"])
            err_pct = abs(p - a) / a * 100
            total_err.append(err_pct)
            direction = "UP" if p > a else "DN"
            label = "GOOD" if err_pct < 1.0 else "MISS" if err_pct > 3.0 else "OK  "
            print(f"  {label} | {r['predicted_for']} | pred={p:>10.4f} | actual={a:>10.4f} | err={err_pct:>5.2f}% | {r['signal']}")

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
