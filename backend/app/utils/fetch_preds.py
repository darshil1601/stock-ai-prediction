import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def get_predictions_for_date(date_str):
    if not url or not key:
        raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env")
    supabase = create_client(url, key)
    resp = supabase.table("predictions").select("*").eq("predicted_for", date_str).execute()
    return resp.data

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
