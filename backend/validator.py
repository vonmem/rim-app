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
            # 1. Fetch Users (Now including relay_expiry!)
            users = supabase.table('users').select("*").execute().data
            
            # ... (Referral Logic stays the same) ...
            referral_counts = {}
            for u in users:
                referrer = u.get('referred_by')
                if referrer:
                    referral_counts[referrer] = referral_counts.get(referrer, 0) + 1

            active_miners = 0
            print(f"\n--- TICK START: {datetime.now().strftime('%H:%M:%S')} ---")
            
            for user in users:
                last_beat_str = user.get('last_heartbeat')
                relay_expiry_str = user.get('relay_expiry') # Fetch expiry
                
                if not last_beat_str:
                    continue

                # --- 1. CHECK STATUS (Offline vs Online) ---
                is_online = False
                status_msg = "OFFLINE"
                
                try:
                    # Parse Heartbeat
                    last_beat_str = last_beat_str.replace('Z', '+00:00')
                    last_beat_time = datetime.fromisoformat(last_beat_str)
                    now = datetime.now(timezone.utc)
                    seconds_diff = (now - last_beat_time).total_seconds()
                    
                    if seconds_diff <= TIMEOUT_SECONDS:
                        is_online = True
                        status_msg = f"ONLINE ({int(seconds_diff)}s lag)"
                    
                except Exception as e:
                    print(f"⚠️ Time Error {user['id']}: {e}")
                    continue

                # --- 2. CHECK CLOUD RELAY (The "Save" Roll) ---
                has_active_relay = False
                if not is_online and relay_expiry_str:
                    try:
                        relay_expiry_str = relay_expiry_str.replace('Z', '+00:00')
                        expiry_time = datetime.fromisoformat(relay_expiry_str)
                        
                        if expiry_time > now:
                            has_active_relay = True
                            status_msg = "CLOUD RELAY ACTIVE ☁️"
                            
                    except Exception as e:
                        print(f"Relay Error {user['id']}: {e}")

                # --- 3. DECISION: PAY or SKIP ---
                # Pay if: (User is Online) OR (User has Active Relay)
                if not is_online and not has_active_relay:
                    # print(f"❌ User {user['id']} | SKIPPED (Offline {int(seconds_diff)}s)")
                    continue

                # --- 4. PAYOUT LOGIC (Same as before) ---
                current_balance = float(user['balance'])
                multiplier, bandwidth_cap = get_tier_stats(current_balance)
                
                mining_reward = (BASE_RATE * multiplier) * 5 
                
                total_refs = referral_counts.get(user['id'], 0)
                active_refs = min(total_refs, bandwidth_cap) 
                referral_reward = active_refs * REFERRAL_BONUS_PER_TICK
                
                total_reward = mining_reward + referral_reward
                
                new_balance = current_balance + total_reward
                supabase.table('users').update({'balance': new_balance}).eq('id', user['id']).execute()
                
                active_miners += 1
                print(f"✅ User {user['id']} | PAID +{total_reward:.4f} | Status: {status_msg}")

            if active_miners == 0:
                print("💤 No active miners found.")
            
        except Exception as e:
            print(f"⚠️ CRITICAL ERROR: {e}")

        time.sleep(5)

if __name__ == "__main__":
    asyncio.run(run_validator())