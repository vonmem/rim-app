import os
import time
import asyncio
import json
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

# --- THE SEVEN SAGES HIERARCHY (Mapped to React IDs) ---
TIER_CONFIG = [
    {'id': 7.3, 'threshold': 20000000, 'mult': 100.0, 'cap': 100000},
    {'id': 7.2, 'threshold': 5000000,  'mult': 25.0,  'cap': 25000},
    {'id': 7.1, 'threshold': 1500000,  'mult': 10.0,  'cap': 10000},
    {'id': 6,   'threshold': 500000,   'mult': 5.0,   'cap': 5000},
    {'id': 5,   'threshold': 100000,   'mult': 3.0,   'cap': 1000},
    {'id': 4,   'threshold': 20000,    'mult': 2.0,   'cap': 200},
    {'id': 3,   'threshold': 5000,     'mult': 1.5,   'cap': 50},
    {'id': 2,   'threshold': 1000,     'mult': 1.2,   'cap': 20},
    {'id': 1,   'threshold': 0,        'mult': 1.0,   'cap': 10}
]

def get_tier_stats(balance, inventory_data):
    highest_mult = 1.0
    highest_cap = 10
    
    # 🚨 AGGRESSIVE PARSER: Catch whatever weird format Supabase throws at us
    safe_inventory = []
    
    if isinstance(inventory_data, str):
        try:
            # Try parsing it if it's a JSON string: '["7.2", "3"]'
            parsed = json.loads(inventory_data)
            if isinstance(parsed, list):
                safe_inventory = [str(i).strip() for i in parsed]
        except:
            # Try parsing it if it's a Postgres array string: '{7.2, 3}'
            clean_str = inventory_data.replace('{', '').replace('}', '').replace('[', '').replace(']', '').replace('"', '').replace("'", "")
            safe_inventory = [i.strip() for i in clean_str.split(',') if i.strip()]
            
    elif isinstance(inventory_data, list):
        # If it's already a perfect list
        safe_inventory = [str(i).strip() for i in inventory_data]

    # 1. Check Inventory FIRST (Respects the Rigs you actually bought!)
    for t in TIER_CONFIG:
        tier_id_str = str(t['id'])
        if tier_id_str in safe_inventory:
            if t['mult'] > highest_mult:
                highest_mult = t['mult']
                highest_cap = t['cap']
                
    # 2. Check Balance as fallback
    for t in TIER_CONFIG:
        if balance >= t['threshold']:
            if t['mult'] > highest_mult:
                highest_mult = t['mult']
                highest_cap = t['cap']
                
    return highest_mult, highest_cap

# Helper function to check if a timer is still active (handles both milliseconds and ISO strings)
def is_buff_active(expiry_val):
    if not expiry_val: 
        return False
    
    # 🚨 SAFETY NET: Catch strings like "null" or "undefined"
    if isinstance(expiry_val, str) and expiry_val.lower() in ['null', 'undefined', 'none', '']:
        return False

    try:
        now_ms = time.time() * 1000
        # If it's a millisecond integer (from React Date.now())
        if isinstance(expiry_val, (int, float)):
            return expiry_val > now_ms
        
        # If it's a string from the DB
        if isinstance(expiry_val, str):
            if expiry_val.isdigit():
                return int(expiry_val) > now_ms
            
            # Fallback for ISO format
            expiry_str = expiry_val.replace('Z', '+00:00')
            expiry_time = datetime.fromisoformat(expiry_str)
            return expiry_time > datetime.now(timezone.utc)
            
    except Exception as e:
        # print(f"⚠️ Timer Parse Error on {expiry_val}: {e}") # Uncomment to debug
        return False
        
    return False

async def run_validator():
    print(f"🛡️  RIM PROTOCOL: VALIDATOR ONLINE (Timeout: {TIMEOUT_SECONDS}s)")
    print("-------------------------------------------------------")

    while True:
        try:
            # 1. Fetch Users
            users = supabase.table('users').select("*").execute().data
            
            # 2. Map Referrals
            referral_counts = {}
            for u in users:
                referrer = u.get('referred_by')
                if referrer:
                    referral_counts[referrer] = referral_counts.get(referrer, 0) + 1

            active_miners = 0
            print(f"\n--- TICK START: {datetime.now().strftime('%H:%M:%S')} ---")
            
            for user in users:
                last_beat_str = user.get('last_heartbeat')
                relay_expiry = user.get('relay_expiry')
                booster_expiry = user.get('booster_expiry')
                botnet_expiry = user.get('botnet_expiry')
                cooldown_expiry = user.get('cooldown_until') # 🚨 FETCH THE COOLDOWN!

                # --- 0. THE MASTER LOCK (CHECK OVERHEAT FIRST) ---
                # If they are on cooldown, completely skip them. No relay saves them!
                if is_buff_active(cooldown_expiry):
                    print(f"🛑 User {user['id']} | SYSTEM COOLING. Payouts locked.")
                    continue

                # --- 1. CHECK ACTIVE BUFFS ---
                # We use your existing helper function! Much cleaner!
                has_active_relay = is_buff_active(relay_expiry)
                has_active_booster = is_buff_active(booster_expiry)
                has_active_botnet = is_buff_active(botnet_expiry)

                # --- 2. CHECK STATUS (Offline vs Online) ---
                is_online = False
                status_msg = "OFFLINE"
                
                try:
                    now_dt = datetime.now(timezone.utc)
                    if last_beat_str:
                        last_beat_str_clean = last_beat_str.replace('Z', '+00:00')
                        last_beat_time = datetime.fromisoformat(last_beat_str_clean)
                        seconds_diff = (now_dt - last_beat_time).total_seconds()
                        
                        if seconds_diff <= TIMEOUT_SECONDS: 
                            is_online = True
                            status_msg = f"ONLINE ({int(seconds_diff)}s lag)"
                except Exception as e:
                    pass

                # 🚨 THE OVERRIDE: If not online but relay is active, update text!
                if not is_online and has_active_relay:
                    status_msg = "CLOUD RELAY ACTIVE ☁️"

                # 🛑 THE MASTER GATE: Skip if completely offline and no relay
                if not is_online and not has_active_relay:
                    continue

                # --- 3. PAYOUT LOGIC ---
                raw_balance = user.get('balance')
                current_balance = float(raw_balance) if raw_balance is not None else 0.0
                inventory = user.get('inventory') or []
                multiplier, bandwidth_cap = get_tier_stats(current_balance, inventory)

                # 🚨 ADD THIS DIAGNOSTIC LOG!
                print(f"🔍 DEBUG: Inv Raw: {inventory} | Calc Mult: {multiplier}x")
                
                # Apply Signal Booster (+20%)
                if has_active_booster:
                    multiplier *= 1.2
                
                mining_reward = (BASE_RATE * multiplier) * 5 
                
                # Apply Botnet Injection (2x Referrals)
                total_refs = referral_counts.get(user['id'], 0)
                active_refs = min(total_refs, bandwidth_cap) 
                
                ref_mult = 2.0 if has_active_botnet else 1.0
                referral_reward = active_refs * REFERRAL_BONUS_PER_TICK * ref_mult
                
                total_reward = mining_reward + referral_reward
                
                # 4. Update Database
                new_balance = current_balance + total_reward
                supabase.table('users').update({'balance': new_balance}).eq('id', user['id']).execute()
                
                active_miners += 1
                
                # Console Output for Debugging
                buff_tags = []
                if has_active_booster: buff_tags.append("📡")
                if has_active_botnet: buff_tags.append("🦠")
                tag_str = "".join(buff_tags)
                
                print(f"✅ User {user['id']} | PAID +{total_reward:.4f} {tag_str} | Status: {status_msg}")

            if active_miners == 0:
                print("💤 No active miners found.")
            
        except Exception as e:
            print(f"⚠️ CRITICAL ERROR: {e}")

        time.sleep(5)

if __name__ == "__main__":
    asyncio.run(run_validator())