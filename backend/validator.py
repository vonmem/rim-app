import os
import time
import asyncio
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env variables
load_dotenv()

URL = os.environ.get("VITE_SUPABASE_URL")
KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not URL or not KEY:
    print("❌ ERROR: Missing Supabase Credentials")
    exit()

supabase: Client = create_client(URL, KEY)

# CONFIG
BASE_RATE = 0.1
REFERRAL_BONUS_PER_TICK = 0.003 * 5 
TIMEOUT_SECONDS = 60  # Increased from 30s to 60s for stability

# TIERS
TIER_CONFIG = [
    {'threshold': 20000000, 'mult': 100.0, 'cap': 1000}, 
    {'threshold': 5000000,  'mult': 25.0,  'cap': 1000}, 
    {'threshold': 1500000,  'mult': 10.0,  'cap': 1000}, 
    {'threshold': 500000,   'mult': 5.0,   'cap': 500},  
    {'threshold': 100000,   'mult': 3.0,   'cap': 250},  
    {'threshold': 20000,    'mult': 2.0,   'cap': 100},  
    {'threshold': 5000,     'mult': 1.5,   'cap': 50},   
    {'threshold': 1000,     'mult': 1.2,   'cap': 25},   
    {'threshold': 0,        'mult': 1.0,   'cap': 10}    
]

def get_tier_stats(balance):
    for t in TIER_CONFIG:
        if balance >= t['threshold']:
            return t['mult'], t['cap']
    return 1.0, 10

async def run_validator():
    print(f"🛡️  RIM PROTOCOL: DEBUG VALIDATOR ONLINE (Timeout: {TIMEOUT_SECONDS}s)")
    print("-------------------------------------------------------")

    while True:
        try:
            # 1. Fetch Users
            response = supabase.table('users').select("*").execute()
            users = response.data
            
            # 2. Build Referral Map
            referral_counts = {}
            for u in users:
                referrer = u.get('referred_by')
                if referrer:
                    referral_counts[referrer] = referral_counts.get(referrer, 0) + 1

            active_miners = 0
            
            # 3. Process Payouts
            print(f"\n--- TICK START: {datetime.now().strftime('%H:%M:%S')} ---")
            
            for user in users:
                last_beat_str = user.get('last_heartbeat')
                
                if not last_beat_str:
                    # print(f"User {user['id']}: No Heartbeat found.")
                    continue

                try:
                    # Robust ISO Parsing (Handles 'Z' or '+00:00')
                    last_beat_str = last_beat_str.replace('Z', '+00:00')
                    last_beat_time = datetime.fromisoformat(last_beat_str)
                    
                    # Ensure we are comparing UTC to UTC
                    now = datetime.now(timezone.utc)
                    seconds_diff = (now - last_beat_time).total_seconds()
                    
                    # DEBUG LOG: Show the time difference
                    # print(f"User {user['id']} | Last Seen: {int(seconds_diff)}s ago", end=" ")

                    if seconds_diff > TIMEOUT_SECONDS:
                        print(f"❌ User {user['id']} | SKIPPED (Offline for {int(seconds_diff)}s)")
                        continue

                except Exception as e:
                    print(f"⚠️ Timestamp Error for {user['id']}: {e}")
                    continue

                # --- PAYOUT CALCULATION ---
                current_balance = float(user['balance'])
                multiplier, bandwidth_cap = get_tier_stats(current_balance)
                
                # Mining Reward
                mining_reward = (BASE_RATE * multiplier) * 5 
                
                # Referral Reward
                total_refs = referral_counts.get(user['id'], 0)
                active_refs = min(total_refs, bandwidth_cap) 
                referral_reward = active_refs * REFERRAL_BONUS_PER_TICK
                
                total_reward = mining_reward + referral_reward
                
                # Update DB
                new_balance = current_balance + total_reward
                supabase.table('users').update({'balance': new_balance}).eq('id', user['id']).execute()
                
                active_miners += 1
                print(f"✅ User {user['id']} | PAID +{total_reward:.4f} (Seen {int(seconds_diff)}s ago)")

            if active_miners == 0:
                print("💤 No active miners found.")
            
        except Exception as e:
            print(f"⚠️ CRITICAL ERROR: {e}")

        time.sleep(5)

if __name__ == "__main__":
    asyncio.run(run_validator())