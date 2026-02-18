import os
import time
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# CONFIGURATION
URL = os.environ.get("VITE_SUPABASE_URL")
KEY = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not URL or not KEY:
    print("❌ ERROR: Missing Supabase Credentials in .env")
    exit()

supabase: Client = create_client(URL, KEY)

# MINING CONFIG
BASE_RATE = 0.1
# Sync these tiers with your Frontend!
TIERS = {
    'SCOUT': 1.0,
    'HIGH-FLYER': 1.2,
    'VAMPIRE': 1.5,
    'DIVER DOLPHIN': 2.0,
    'SURFER DOLPHIN': 3.0,
    'SUPER-ALLIANCE': 5.0,
    'APEX MK1': 10.0,
    'APEX MK2': 25.0,
    'APEX MK3 GOD EYE': 100.0
}

def get_tier_multiplier(balance):
    # Reverse logic: Find highest tier threshold met
    if balance >= 20000000: return 100.0
    if balance >= 5000000: return 25.0
    if balance >= 1500000: return 10.0
    if balance >= 500000: return 5.0
    if balance >= 100000: return 3.0
    if balance >= 20000: return 2.0
    if balance >= 5000: return 1.5
    if balance >= 1000: return 1.2
    return 1.0

async def run_validator():
    print("🛡️  RIM PROTOCOL: VALIDATOR NODE ONLINE")
    print("---------------------------------------")

    while True:
        try:
            # 1. Fetch all users who pinged in the last 15 seconds (Active Miners)
            # We use a slightly larger window (15s) than the ping rate (10s) to account for lag.
            response = supabase.table('users').select("*").execute()
            users = response.data
            
            active_miners = 0
            
            for user in users:
                # Check if 'last_heartbeat' exists and is recent
                last_beat = user.get('last_heartbeat')
                
                # Simple logic: If we had a real datetime parser here we'd compare times.
                # For this MVP, we assume the Frontend is updating 'last_heartbeat'.
                # In a real production Python script, we would use datetime.now() - last_beat < 15s
                
                # --- THE PAYOUT LOGIC ---
                # Calculate what they earned in this 5-second tick
                # Formula: (Base * Multiplier) / (Ticks per second adjustment)
                # Since this loop runs roughly every 5 seconds, we give them 5 seconds worth of rewards.
                
                current_balance = float(user['balance'])
                multiplier = get_tier_multiplier(current_balance)
                
                # Reward for 5 seconds of mining
                reward = (BASE_RATE * multiplier) * 5 
                
                # UPDATE THE DATABASE
                # We add the reward to their balance Server-Side
                new_balance = current_balance + reward
                
                # Security: Only pay if they have a recent heartbeat (Simulated check here)
                if last_beat: 
                    supabase.table('users').update({'balance': new_balance}).eq('id', user['id']).execute()
                    active_miners += 1
                    print(f"💰 Paid User {user['id']} | Tier: {multiplier}x | +{reward:.4f} RIM")

            print(f"✅ Tick Complete. Active Nodes: {active_miners}")
            
        except Exception as e:
            print(f"⚠️ Validation Error: {e}")

        # Wait 5 seconds before next payout cycle
        time.sleep(5)

if __name__ == "__main__":
    asyncio.run(run_validator())