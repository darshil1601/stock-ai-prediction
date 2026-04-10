import sys
from app.utils.fetch_preds import get_predictions_for_date

if __name__ == "__main__":
    date = "2026-03-27"
    try:
        results = get_predictions_for_date(date)
        print(f"\n--- Predictions for {date} ---")
        if not results:
            print("No predictions found for this date.")
        for r in results:
            print(f"Symbol: {r['symbol']}, Predicted: {r['predicted_price']}, Actual: {r['actual_price']}, Signal: {r['signal']}, Confidence: {r['confidence']}")
    except Exception as e:
        print(f"Error: {e}")
