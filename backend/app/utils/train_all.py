"""
train_all.py — Orchestrates LSTM V2 training for all supported symbols.
"""
import sys
from app.services.training.lstm_trainer import train

SYMBOLS = ["XAU/USD", "EUR/USD", "BTC/USD"]

def train_all_symbols():
    """
    Sequentially trains LSTM models for all active assets.
    """
    print(f"\n{'#'*60}")
    print(f"  AI SELF-LEARNING CORE: Full Retrain Commencing...")
    print(f"{'#'*60}")

    for sym in SYMBOLS:
        try:
            print(f"\n[Retrain] Learning new patterns for: {sym}")
            train(sym)
            print(f"[SUCCESS] Training result for {sym}")
        except Exception as e:
            print(f"[FAILED] Training result for {sym} - {e}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*60}")
    print(f"  Retrain complete. AI successfully updated for new market regime.")
    print(f"{'='*60}")

if __name__ == "__main__":
    target_symbols = sys.argv[1:] if len(sys.argv) > 1 else SYMBOLS
    if len(target_symbols) == 1:
        train(target_symbols[0])
    else:
        train_all_symbols()
