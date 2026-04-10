import os
from dotenv import load_dotenv
from upstash_redis import Redis

# Load environment variables
load_dotenv()

def clear_redis_cache():
    try:
        # Connect to Upstash
        redis = Redis(
            url=os.environ["UPSTASH_REDIS_REST_URL"],
            token=os.environ["UPSTASH_REDIS_REST_TOKEN"],
        )

        print("🔄 Clearing Redis Cache...")
        
        # .flushdb() deletes all keys in the current database
        redis.flushdb()
        
        print("✅ Cache cleared successfully!")
    except Exception as e:
        print(f"❌ Error clearing cache: {e}")

if __name__ == "__main__":
    clear_redis_cache()
