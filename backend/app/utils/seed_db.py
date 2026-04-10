"""seed_db.py — Run once to populate Supabase with 5yr GOLD historical data."""
from dotenv import load_dotenv
load_dotenv()

from app.services.twelve_fetcher import fetch_historical_data
from app.database import save_market_prices

def seed_gold_data():
    print("Fetching XAU/USD data from Twelve Data...")
    df = fetch_historical_data("XAU/USD", outputsize=5000)
    print(f"Got {len(df)} rows  |  {df['date'].iloc[0]} to {df['date'].iloc[-1]}")

    records = []
    for row in df.to_dict(orient="records"):
        records.append({
            "symbol": "XAU/USD",
            "date":   str(row["date"]),
            "open":   float(row["open"]),
            "high":   float(row["high"]),
            "low":    float(row["low"]),
            "close":  float(row["close"]),
            "volume": int(row["volume"]),
        })

    print("Saving to Supabase in batches...")
    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        save_market_prices("XAU/USD", batch)
        print(f"  Batch {i // batch_size + 1}: saved {len(batch)} rows")

    print(f"\nDone! {len(records)} rows seeded into Supabase market_data table.")

if __name__ == "__main__":
    seed_gold_data()
