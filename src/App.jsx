import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Terminal, Users, Zap, DollarSign, MapPin, Signal, Wallet, AlertTriangle } from 'lucide-react'

// --- COMPONENTS ---
import MiningRig from './components/MiningRig'
import StatsPanel from './components/StatsPanel'
import MapTab from './components/MapTab';
import Inventory from './components/Inventory';
import Marketplace from './components/Marketplace';

// --- SERVICES ---
// Note: Ensure you created these files in src/services/
// If you haven't created them yet, the app will break.
import LocationService from './services/LocationService' 
import TelemetryService from './services/TelemetryService'

// --- CONFIGURATION ---
const BASE_MINING_RATE = 0.1; 
const HALVING_MULTIPLIER = 1.0; 
const GOD_MODE_DAILY_LIMIT = 10; 
const REFERRAL_RATE_PER_TICK = 0.003; 

// --- THE SEVEN SAGES HIERARCHY ---
const TIERS = [
  { id: 1, name: 'SCOUT', type: 'FREE', threshold: 0, multiplier: 1.0, bandwidth: 10, color: '#3b82f6', icon: '🦇', image: '/scout.png' },
  { id: 2, name: 'PRO BAT', type: 'RIG', threshold: 1000, multiplier: 1.2, bandwidth: 20, color: '#8b5cf6', icon: '🦇', image: '/pro_bat.png' },
  { id: 3, name: 'VAMPIRE', type: 'RIG', threshold: 5000, multiplier: 1.5, bandwidth: 50, color: '#ef4444', icon: '🧛', image: '/vampire.png' },
  { id: 4, name: 'DIVER', type: 'RIG', threshold: 20000, multiplier: 2.0, bandwidth: 200, color: '#06b6d4', icon: '🐬', image: '/diver.png' },
  { id: 5, name: 'SURFER', type: 'RIG', threshold: 100000, multiplier: 3.0, bandwidth: 1000, color: '#f59e0b', icon: '🐋', image: '/surfer.png' },
  { id: 6, name: 'ALLIANCE', type: 'RIG', threshold: 500000, multiplier: 5.0, bandwidth: 5000, color: '#10b981', icon: '🔱', image: '/alliance.png' },
  { id: 7.1, name: 'APEX MK1', type: 'GOD', threshold: 1500000, multiplier: 10.0, bandwidth: 10000, color: '#f43f5e', icon: '👁️', image: '/apex1.png' },
  { id: 7.2, name: 'APEX MK2', type: 'GOD', threshold: 5000000, multiplier: 25.0, bandwidth: 25000, color: '#d946ef', icon: '🌀', image: '/apex2.png' },
  { id: 7.3, name: 'GOD EYE', type: 'GOD', threshold: 20000000, multiplier: 100.0, bandwidth: 100000, color: '#fbbf24', icon: '☀️', image: '/apex3.png' }
];

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function App() {
// --- STATE ---
  const [tab, setTab] = useState('TERMINAL');
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [referralCount, setReferralCount] = useState(0);
  const [inventory, setInventory] = useState([]); // Stores purchased NFTs ['tier_2', etc.]
  const [toast, setToast] = useState(null); // { message: "Access Granted", type: "success" }
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Forces the UI to re-render every second so the Cooldown Timer visually ticks down!
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // --- CONSUMABLE TIMERS ---
  // Using lazy initialization `() =>` safely checks local storage only on the first load
  const [relayExpiry, setRelayExpiry] = useState(() => parseInt(localStorage.getItem('relayExpiry')) || null);
  const [boosterExpiry, setBoosterExpiry] = useState(() => parseInt(localStorage.getItem('boosterExpiry')) || null);
  const [botnetExpiry, setBotnetExpiry] = useState(() => parseInt(localStorage.getItem('botnetExpiry')) || null);

  // Auto-save the timers to the user's phone whenever they change
  useEffect(() => {
    if (relayExpiry) localStorage.setItem('relayExpiry', relayExpiry.toString());
    if (boosterExpiry) localStorage.setItem('boosterExpiry', boosterExpiry.toString());
    if (botnetExpiry) localStorage.setItem('botnetExpiry', botnetExpiry.toString());
  }, [relayExpiry, boosterExpiry, botnetExpiry]);

  // Telemetry State (The "Fog of War" Data)
  const [locationData, setLocationData] = useState(null);
  const [signalStrength, setSignalStrength] = useState('UNKNOWN');
  const [cityNodeCount, setCityNodeCount] = useState(0); // Simulated "Nodes in your city"

  // Overheat State
  const [godModeElapsed, setGodModeElapsed] = useState(0);
  const [isOverheated, setIsOverheated] = useState(false);

  // --- REFS ---
  const balanceRef = useRef(balance);
  const godModeRef = useRef(0);
  const miningInterval = useRef(null);
  
  // NEW: Refs for instant interval updates
  const boosterRef = useRef(boosterExpiry);
  const botnetRef = useRef(botnetExpiry);

  // Keep the Refs perfectly in sync with the State
  useEffect(() => {
    boosterRef.current = boosterExpiry;
  }, [boosterExpiry]);

  useEffect(() => {
    botnetRef.current = botnetExpiry;
  }, [botnetExpiry]);

  // Calculate Tier based on OWNED ITEMS, not Balance
  const currentTier = [...TIERS].reverse().find(t => 
    t.id === 1 || inventory.includes(`tier_${t.id}`)
  ) || TIERS[0];
  
  // 🚨 THE FIX: Force multiplier to 0 if we are on Cooldown!
  const effectiveMultiplier = (isOverheated || (cooldownUntil && cooldownUntil > Date.now())) 
      ? 0 
      : currentTier.multiplier;

  const activeReferrals = Math.min(referralCount, currentTier.bandwidth);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const init = async () => {
      let currentUser = null;
      let startParam = null;

      // Telegram WebApp Init
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#000000');
        if (tg.initDataUnsafe?.user) currentUser = tg.initDataUnsafe.user;
        if (tg.initDataUnsafe?.start_param) startParam = tg.initDataUnsafe.start_param;
      }

      // Fallback for Dev
      if (!currentUser) currentUser = { id: 999999999, first_name: 'Origin', username: 'founder' };
      setUser(currentUser);

      // Database Fetch
      if (currentUser) {
        // We select 'inventory' along with everything else
        const { data } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
        
        if (data) {
          // EXISTING USER: Load their saved data
          setBalance(data.balance);
          balanceRef.current = data.balance;
          setReferralCount(0); // In prod, fetch real count
          
          // NEW: Load their inventory (default to empty array if null)
          setInventory(data.inventory || []); 
          
          // 🚨 RESTORE BLACK MARKET TIMERS FROM DATABASE
          if (data.relay_expiry) {
             const relayMs = new Date(data.relay_expiry).getTime();
             setRelayExpiry(relayMs);
             localStorage.setItem('relayExpiry', relayMs.toString());
          }
          
          if (data.booster_expiry) {
             setBoosterExpiry(data.booster_expiry);
             localStorage.setItem('boosterExpiry', data.booster_expiry.toString());
          }
          
          if (data.botnet_expiry) {
             setBotnetExpiry(data.botnet_expiry);
             localStorage.setItem('botnetExpiry', data.botnet_expiry.toString());
          }

          // 👇 THE AMNESIA FIX: RESTORE OVERHEAT COOLDOWN STATE
          if (data.cooldown_until) {
             const cooldownMs = parseInt(data.cooldown_until, 10);
             if (cooldownMs > Date.now()) {
                 // 🔒 The system is STILL cooling down! Force the locks!
                 setCooldownUntil(cooldownMs);
                 setIsOverheated(true);
                 setStatus('IDLE'); // Ensure the miner is off
                 
                 // Snap the visual progress bar back to 100%
                 setGodModeElapsed(GOD_MODE_DAILY_LIMIT);
                 godModeRef.current = GOD_MODE_DAILY_LIMIT; 
             }
          }

          // 👇 STEP B FIX: TELL THE APP WE ARE READY TO RENDER
          setIsDataLoaded(true); 
          
        } else {
          // NEW USER: Create account
          let referrerId = null;
          if (startParam && startParam.startsWith('ref_')) {
             referrerId = parseInt(startParam.split('_')[1]);
          }
          
          // Insert with default empty inventory
          await supabase.from('users').insert({ 
            id: currentUser.id, 
            first_name: currentUser.first_name, 
            balance: 100,
            referred_by: referrerId,
            inventory: [] // Start with empty pockets
          });
          
          setBalance(100);
          balanceRef.current = 100;
          setInventory([]);
          
          // 👇 STEP B FIX: TELL THE APP NEW USER IS READY TO RENDER
          setIsDataLoaded(true); 
        }
      }
    };
    init();
  }, []);

  // --- 2. TELEMETRY ENGINE (The "Ghost" Collector) ---
  useEffect(() => {
    // Only collect data when MINING is active to save battery/bandwidth
    if (status === 'MINING') {
      const collectSignal = async () => {
        // A. Get Network Stats
        const netStats = await TelemetryService.getNetworkStats();
        setSignalStrength(netStats.type === 'wifi' || netStats.type === '4g' ? 'STRONG' : 'WEAK');

        // B. Get Location (H3 Index)
        // Note: This might ask user for permission. If denied, it returns null.
        try {
           // We only ask for location once per session to avoid annoying the user
           if (!locationData) {
              const loc = await LocationService.getHexId();
              if (loc) {
                setLocationData(loc);
                // Simulate fetching "Nodes in this City" from DB
                // In real app: await supabase.rpc('count_nodes_in_hex', { hex: loc.h3Index })
                setCityNodeCount(Math.floor(Math.random() * 500) + 100); 
              }
           }
        } catch (e) {
           console.log("Loc Service Silent Fail");
        }
      };
      
      collectSignal();
      // Refresh signal stats every 30s
      const signalInterval = setInterval(collectSignal, 30000);
      return () => clearInterval(signalInterval);
    }
  }, [status, locationData]);

  // --- 3. HEARTBEAT & SYNC LOOP (The "Proof of Life") ---
  useEffect(() => {
    // A. Heartbeat (Send "I am alive" & Active Buffs to server)
    const beater = setInterval(async () => {
      if (status === 'MINING' && user) {
        // Create the timestamp INSIDE the interval so it is always fresh
        const now = new Date().toISOString();
        
        // 1. Fetch from LocalStorage
        const relayMs = parseInt(localStorage.getItem('relayExpiry'));
        const currentBooster = parseInt(localStorage.getItem('boosterExpiry')) || null;
        const currentBotnet = parseInt(localStorage.getItem('botnetExpiry')) || null;

        // 2. Format relay_expiry as timestamptz (ISO String) for Supabase
        const currentRelayFormatted = relayMs ? new Date(relayMs).toISOString() : null;

        // 3. Fire and forget - update the timestamp AND the Black Market timers
        const { error } = await supabase.from('users').update({ 
          last_heartbeat: now,
          relay_expiry: currentRelayFormatted, // Sent as a formatted Date string!
          booster_expiry: currentBooster,      // Sent as an int8 number!
          botnet_expiry: currentBotnet         // Sent as an int8 number!
        }).eq('id', user.id);

        if (error) {
           console.error("🚨 SUPABASE HEARTBEAT ERROR:", error.message);
        }
      }
    }, 10000); // Ping every 10 seconds

    // B. Re-Sync (Get "True Balance" from server)
    const syncer = setInterval(async () => {
      if (user) {
        const { data } = await supabase.from('users').select('balance').eq('id', user.id).single();
        if (data) {
          // If our local visual balance is wildly different (>50 diff), snap to server balance
          if (Math.abs(balanceRef.current - data.balance) > 50) {
             console.log("Syncing with Validator...");
             setBalance(data.balance);
             balanceRef.current = data.balance;
          }
        }
      }
    }, 30000); // Check server truth every 30s

    return () => {
      clearInterval(beater);
      clearInterval(syncer);
    };
  }, [user, status]);

  // --- 4. MINING TOGGLE ---
  const toggleMining = () => {
    if (status === 'MINING') {
      setStatus('IDLE');
      clearInterval(miningInterval.current);
      clearInterval(godModeRef.current); 
    } else {
      setStatus('MINING');
      
      miningInterval.current = setInterval(() => {
        const now = Date.now();
        const loadFactor = (Math.random() * 0.2) + 0.8; 
        
        // 1. Base Multiplier & God Mode Logic
        if (currentTier.id === 7.3) { // God Eye Tier
           // 🚨 CHECK IF OVERHEATED FIRST
           if (godModeRef.current >= GOD_MODE_DAILY_LIMIT) {
             godModeRef.current = GOD_MODE_DAILY_LIMIT; 
             setGodModeElapsed(GOD_MODE_DAILY_LIMIT);
             
             setStatus('IDLE'); 
             setIsOverheated(true);
             
             // 1. Get the indestructible User ID
             const safeUserId = user?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
             
             // 2. Set the 20-hour Cooldown Time
             const cooldownTime = Date.now() + (20 * 60 * 60 * 1000); 
             
             // 3. Update React State
             setCooldownUntil(prev => {
                 if (!prev || prev < Date.now()) return cooldownTime;
                 return prev;
             });

             // 4. Force Supabase to save it immediately using the safe ID
             if (safeUserId) {
                 supabase.from('users')
                     .update({ cooldown_until: cooldownTime })
                     .eq('id', safeUserId)
                     .then(({ error }) => {
                         if (error) {
                             console.error("❌ SUPABASE SAVE ERROR:", error.message);
                         } else {
                             console.log(`✅ OVERHEAT LOCKED IN DB FOR USER ${safeUserId}:`, cooldownTime);
                         }
                     });
             } else {
                 console.error("❌ GHOST USER BUG: Could not find User ID to save overheat!");
             }
             
             return; 
           }
           
           // If NOT overheated, tick up normally
           godModeRef.current += 0.1;
           setGodModeElapsed(Math.floor(godModeRef.current));
        }

        // 2. 📡 APPLY SIGNAL BOOSTER INSTANTLY (+20%)
        if (boosterRef.current && boosterRef.current > now) {
            currentMult *= 1.2;
        }

        const miningEarned = (BASE_MINING_RATE * currentMult * loadFactor * HALVING_MULTIPLIER) / 10;
        
        // 3. 🦠 APPLY BOTNET INJECTION INSTANTLY (2x Yield)
        let refMult = 1.0;
        if (botnetRef.current && botnetRef.current > now) {
            refMult = 2.0;
        }

        const referralEarned = (activeReferrals * REFERRAL_RATE_PER_TICK * refMult);
        
        // 4. Final Math
        const totalEarned = miningEarned + referralEarned;

        const newBal = parseFloat((balanceRef.current + totalEarned).toFixed(3));
        setBalance(newBal);
        balanceRef.current = newBal;
      }, 100); 
    }
  };

  const handleInvite = () => {
    if (!user) return;
    const botUsername = 'RIM_Protocol_Bot'; 
    const inviteLink = `https://t.me/${botUsername}/start?startapp=ref_${user.id}`;
    const text = `Join the RIM Intelligence Swarm. Activate your node.`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // --- TIMER HELPER ---
  const getTimeLeft = (expiryTime) => {
    if (!expiryTime) return null; // Timer not active
    const remaining = expiryTime - Date.now();
    if (remaining <= 0) return null; // Timer expired
    
    const h = Math.floor(remaining / (1000 * 60 * 60));
    const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}m`;
  };
  
  // ==========================================
  // INDESTRUCTIBLE TOAST CONTROLLER
  // ==========================================
  const showToast = (message, type = 'success') => {
    console.log("🔥 TOAST FIRED:", message); // Debugging check
    setToast({ message, type });
    
    // Clear the old timer so it doesn't accidentally kill the new toast!
    if (window.toastTimer) clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => setToast(null), 3500);
  };
  // ==========================================

  // Calculates time left for the Cooldown Timer
  const getCooldownDisplay = () => {
    if (!cooldownUntil) return null;
    const left = cooldownUntil - Date.now();
    if (left <= 0) return null; // Cooldown finished!

    const h = Math.floor(left / (1000 * 60 * 60));
    const m = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((left % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleBuyItem = async (item) => {
    // 1. Check if they have enough balance
    if (balanceRef.current < item.price) {
      showToast("⚠️ INSUFFICIENT RP BITS. KEEP MINING.", "error");
      return;
    }

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    // 2. Pre-calculate the new balance (but don't show it visually yet)
    const newBalance = balanceRef.current - item.price;
    
    // This payload will hold EXACTLY what we send to the database
    let updatePayload = { balance: newBalance };

    // 3. Prepare the data based on what they are buying
    if (item.type === 'CONSUMABLE') {
      if (item.id === 'cloud_relay_24h') {
        const newTime = Math.max(now, relayExpiry || 0) + DAY;
        setRelayExpiry(newTime);
        localStorage.setItem('relayExpiry', newTime.toString());
        updatePayload.relay_expiry = new Date(newTime).toISOString(); // timestamptz format!
        
      } else if (item.id === 'cloud_relay_3d') {
        const newTime = Math.max(now, relayExpiry || 0) + (3 * DAY);
        setRelayExpiry(newTime);
        localStorage.setItem('relayExpiry', newTime.toString());
        updatePayload.relay_expiry = new Date(newTime).toISOString(); // timestamptz format!
        
      } else if (item.id === 'cloud_relay_7d') {
        const newTime = Math.max(now, relayExpiry || 0) + (7 * DAY);
        setRelayExpiry(newTime);
        localStorage.setItem('relayExpiry', newTime.toString());
        updatePayload.relay_expiry = new Date(newTime).toISOString(); // timestamptz format!
        
      } else if (item.id === 'signal_booster_1h') {
        const newTime = Math.max(now, boosterExpiry || 0) + HOUR;
        setBoosterExpiry(newTime);
        localStorage.setItem('boosterExpiry', newTime.toString());
        updatePayload.booster_expiry = newTime; // int8 format!
        
      } else if (item.id === 'botnet_injection') {
        const newTime = Math.max(now, botnetExpiry || 0) + DAY;
        setBotnetExpiry(newTime);
        localStorage.setItem('botnetExpiry', newTime.toString());
        updatePayload.botnet_expiry = newTime; // int8 format!
      }
      
    } else if (item.type === 'RIG') {
      if (inventory.includes(item.id)) {
        showToast("⚠️ YOU ALREADY OWN THIS RIG.", "error");
        return; 
      }
      const newInventory = [...inventory, item.id];
      setInventory(newInventory);
      updatePayload.inventory = newInventory;
    }

    // 4. 🚨 THE ATOMIC DATABASE UPDATE 🚨
    // We send the new balance and the new items to Supabase at the EXACT SAME TIME
    const { error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', user.id);

    // If Supabase rejects it, we stop everything and keep their money safe.
    if (error) {
      console.error("Purchase failed:", error.message);
      showToast("❌ TRANSACTION FAILED. SERVER ERROR.", "error");
      return;
    }

    // 5. ONLY if the database accepts it, we update the visual balance!
    setBalance(newBalance);
    balanceRef.current = newBalance;

    // 6. Show the Success Toast
    if (item.type === 'RIG') {
      showToast(`🦇 ${item.name} ACQUIRED! Multiplier Upgraded.`, "success");
    } else {
      showToast(`✅ ${item.name} ACTIVATED!`, "success");
    }
  };

  // 🚨 HIDE THE APP UNTIL SUPABASE LOADS THE INVENTORY
  if (!user || !isDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-cyan-500 font-mono">
        <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
        <p className="tracking-[0.3em] text-sm animate-pulse">ESTABLISHING SECURE UPLINK...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-mono overflow-hidden select-none relative">
      
      {/* HEADER WITH SIGNAL MAP INDICATOR */}
      <div className="p-4 border-b border-gray-900 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex justify-between items-start">
          
          {/* LEFT: TIER INFO & BUFFS */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{currentTier.icon}</span>
              <h1 className="text-sm font-black tracking-[0.2em] uppercase" style={{ color: currentTier.color }}>
                {currentTier.name}
              </h1>
            </div>
            
            <div className="flex flex-col mt-1 space-y-2">
               <div className="flex items-center space-x-2">
                 <span className="text-[9px] text-gray-500 tracking-widest uppercase">{currentTier.type} CLASS</span>
                 
                 {/* THE FOG OF WAR INDICATOR */}
                 {status === 'MINING' && (
                   <div className="flex items-center space-x-1 px-2 py-0.5 bg-gray-900 rounded border border-gray-800 animate-pulse">
                      <Signal size={8} className="text-green-500" />
                      <span className="text-[8px] text-gray-400">
                        {locationData ? `NET: ${cityNodeCount} NODES` : 'NET: SCANNING...'}
                      </span>
                   </div>
                 )}
               </div>

               {/* --- ACTIVE BUFFS / TIMERS --- */}
               <div className="flex flex-col space-y-1">
                  {getTimeLeft(relayExpiry) && (
                     <div className="flex items-center space-x-1 px-2 py-0.5 bg-blue-900/30 rounded border border-blue-500/50 w-max">
                        <span className="text-[8px] text-blue-400 font-bold tracking-wider">
                           ☁️ RELAY: {getTimeLeft(relayExpiry)}
                        </span>
                     </div>
                  )}
                  {getTimeLeft(boosterExpiry) && (
                     <div className="flex items-center space-x-1 px-2 py-0.5 bg-orange-900/30 rounded border border-orange-500/50 w-max animate-pulse">
                        <span className="text-[8px] text-orange-400 font-bold tracking-wider">
                           📡 BOOSTER: {getTimeLeft(boosterExpiry)}
                        </span>
                     </div>
                  )}
                  {getTimeLeft(botnetExpiry) && (
                     <div className="flex items-center space-x-1 px-2 py-0.5 bg-purple-900/30 rounded border border-purple-500/50 w-max">
                        <span className="text-[8px] text-purple-400 font-bold tracking-wider">
                           🦠 BOTNET: {getTimeLeft(botnetExpiry)}
                        </span>
                     </div>
                  )}
               </div>
            </div>
          </div>

          {/* RIGHT: BALANCE & PROGRESS */}
          <div className="text-right flex flex-col items-end">
            <p className="text-[9px] text-gray-600 uppercase">Points (RP)</p>
            <p className="text-2xl font-bold tracking-tighter text-white">
              {balance.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </p>
            
            {/* THE NEXT TIER PROGRESS BAR */}
            {(() => {
              const nextTier = TIERS.find(t => t.id !== 1 && (!inventory || !inventory.includes(`tier_${t.id}`)));
              
              if (!nextTier) return <p className="text-[8px] text-cyan-400 mt-1 uppercase">MAX TIER REACHED</p>;
              
              // FIX: threshold instead of price!
              const rawPrice = typeof nextTier.threshold === 'number' ? nextTier.threshold : parseInt(nextTier.threshold.toString().replace(/[^0-9]/g, ''));
              const progress = Math.min(100, (balance / rawPrice) * 100);
              
              return (
                <div className="w-32 mt-1">
                  <div className="flex justify-between text-[7px] text-gray-500 mb-0.5 uppercase tracking-wider">
                    <span>Next: {nextTier.name}</span>
                    <span>{Math.floor(progress)}%</span>
                  </div>
                  <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      {/* CORE VIEW */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-0 z-10 w-full overflow-hidden">
        
        {/* Custom CSS for the smooth breathing/floating animation */}
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
            100% { transform: translateY(0px); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>

        {tab === 'MAP' ? (
           <MapTab 
              locationData={locationData} 
              cityNodeCount={cityNodeCount} 
           />
        ) : tab === 'WALLET' ? (
           <Inventory 
              balance={balance} 
              currentTier={currentTier} 
              referralCount={referralCount}
           />
        ) : tab === 'MARKET' ? (
           <Marketplace 
              balance={balance} 
              userInventory={inventory}
              onBuyItem={handleBuyItem}
           />
        ) : (
           <>
              {/* GOD MODE STABILITY BAR */}
              {currentTier.id === 7.3 && (
                <div className="absolute top-4 w-full px-12 z-20">
                   <div className="flex justify-between text-[8px] font-bold tracking-widest mb-1">
                      <span className={isOverheated ? 'text-red-500 animate-pulse' : 'text-gray-500'}>
                         {isOverheated ? 'SYSTEM OVERHEATED' : 'GOD MODE STABILITY'}
                      </span>
                      <span className="text-gray-500">{Math.floor((godModeElapsed / GOD_MODE_DAILY_LIMIT) * 100)}%</span>
                   </div>
                   <div className="w-full h-1 bg-gray-900 rounded-full">
                      <div className={`h-full rounded-full ${isOverheated ? 'bg-red-500' : 'bg-white'}`} style={{ width: `${Math.min(100, (godModeElapsed / GOD_MODE_DAILY_LIMIT) * 100)}%` }}></div>
                   </div>
                </div>
              )}

              {/* THE NEW FLOATING MINING RIG (Replaces the old <MiningRig /> tag) */}
              <div 
                // 🚨 CHANGED: Disable the pointer if we are on cooldown!
                className={`flex flex-col items-center justify-center relative w-full max-w-sm mt-8 mb-4 ${
                  isOverheated || (cooldownUntil && cooldownUntil > Date.now()) 
                    ? 'cursor-not-allowed' 
                    : 'cursor-pointer'
                }`} 
                onClick={() => {
                  // 🚨 THE LOCKOUT: Prevent the toggle if they are cooling down!
                  if (isOverheated || (cooldownUntil && cooldownUntil > Date.now())) {
                    showToast("⚠️ SYSTEM COOLING DOWN. PLEASE WAIT.");
                    return;
                  }
                  toggleMining();
                }}
              >
                {/* BACKGROUND GLOW */}
                <div className={`absolute w-72 h-72 rounded-full blur-[80px] transition-all duration-1000 ${
                  isOverheated || (cooldownUntil && cooldownUntil > Date.now()) ? 'bg-red-600/40' : 
                  status === 'MINING' ? 'bg-cyan-500/30' : 'bg-gray-800/20'
                }`}></div>

                {/* THE 3D NFT IMAGE */}
                <div className="relative w-80 h-80 z-10 flex items-center justify-center">
                   <img 
                      src={currentTier.image} 
                      alt={currentTier.name}
                      className={`w-full h-full object-contain transition-all duration-1000 ${
                        isOverheated || (cooldownUntil && cooldownUntil > Date.now()) 
                          ? 'brightness-50 sepia-[.8] hue-rotate-[-50deg] animate-pulse drop-shadow-[0_0_25px_rgba(220,38,38,0.8)]' :
                        status === 'MINING' ? 'animate-float drop-shadow-[0_0_25px_rgba(34,211,238,0.5)]' : 
                        'translate-y-0 grayscale-[0.6] opacity-70 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]'
                      }`}
                   />
                </div>

                {/* STATUS BADGE WITH LIVE TIMER */}
                <div className="mt-8 z-20">
                   <span className={`px-5 py-2 rounded-full text-[11px] font-black tracking-[0.2em] border transition-colors duration-500 ${
                      isOverheated || (cooldownUntil && cooldownUntil > Date.now()) 
                        ? 'bg-red-900/50 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                      status === 'MINING' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 
                      'bg-gray-900 border-gray-700 text-gray-500'
                   }`}>
                      {/* 🚨 CHANGED: Inject the live timer directly into the badge! */}
                      {isOverheated || (cooldownUntil && cooldownUntil > Date.now()) 
                        ? `COOLING: ${getCooldownDisplay()}` 
                        : status === 'MINING' ? 'UPLINK ACTIVE' : 'SYSTEM OFFLINE'}
                   </span>
                </div>
              </div>

              {/* STATS PANEL */}
              <StatsPanel 
                 status={status}
                 isOverheated={isOverheated}
                 currentTier={currentTier}
                 effectiveMultiplier={effectiveMultiplier}
                 baseRate={BASE_MINING_RATE}
                 referralRate={activeReferrals * REFERRAL_RATE_PER_TICK}
              />
           </>
        )}
      </div>

      {/* TABS & MODALS (SQUAD / MARKET) */}
      {/* Keeping these inline for now as they are simple overlays */}
      
      {tab === 'SQUAD' && (
        <div className="absolute inset-0 bg-black z-40 p-6 pt-20 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-xl font-bold flex items-center"><Users className="mr-2" /> NEURAL SQUAD</h2>
             <button onClick={() => setTab('TERMINAL')} className="text-xs text-gray-500">CLOSE</button>
          </div>
          
          <div className="text-center mt-4">
             <div className="w-20 h-20 bg-gray-900 rounded-full mx-auto flex items-center justify-center border border-gray-700 mb-4"><Users size={32} className="text-gray-400"/></div>
             <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">Build the Swarm. Earn royalties from downstream nodes.</p>
             
             {/* BANDWIDTH CAP */}
             <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mb-8 max-w-xs mx-auto text-left">
                <div className="flex justify-between items-end mb-2">
                   <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center"><Zap size={10} className="mr-1"/> Bandwidth Cap</span>
                   <span className={`text-[10px] font-bold ${referralCount > currentTier.bandwidth ? 'text-red-500' : 'text-cyan-400'}`}>
                      {activeReferrals} / {currentTier.bandwidth} NODES
                   </span>
                </div>
                <div className="w-full h-2 bg-black rounded-full overflow-hidden">
                   <div 
                      className={`h-full ${referralCount > currentTier.bandwidth ? 'bg-red-500' : 'bg-cyan-500'}`} 
                      style={{ width: `${Math.min(100, (referralCount / currentTier.bandwidth) * 100)}%` }}
                   ></div>
                </div>
             </div>

             <button onClick={handleInvite} className="w-full py-4 bg-white text-black font-bold tracking-widest hover:bg-cyan-400 transition-colors rounded">INITIATE RECRUITMENT</button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="grid grid-cols-5 border-t border-gray-900 bg-black pb-8 z-50 bg-black">
        <button onClick={() => setTab('TERMINAL')} className={`p-4 flex flex-col items-center ${tab === 'TERMINAL' ? 'text-white' : 'text-gray-600'}`}>
          <Terminal size={18} /><span className="text-[8px] mt-1 font-bold">GRID</span>
        </button>
        <button onClick={() => setTab('MAP')} className={`p-4 flex flex-col items-center ${tab === 'MAP' ? 'text-white' : 'text-gray-600'}`}>
          <MapPin size={18} /><span className="text-[8px] mt-1 font-bold">MAP</span>
        </button>
        <button onClick={() => setTab('WALLET')} className={`p-4 flex flex-col items-center ${tab === 'WALLET' ? 'text-white' : 'text-gray-600'}`}>
          <Wallet size={18} /><span className="text-[8px] mt-1 font-bold">WALLET</span>
        </button>
        <button onClick={() => setTab('SQUAD')} className={`p-4 flex flex-col items-center ${tab === 'SQUAD' ? 'text-white' : 'text-gray-600'}`}>
          <Users size={18} /><span className="text-[8px] mt-1 font-bold">SQUAD</span>
        </button>
        <button onClick={() => setTab('MARKET')} className={`p-4 flex flex-col items-center ${tab === 'MARKET' ? 'text-white' : 'text-gray-600'}`}>
          <Zap size={18} /><span className="text-[8px] mt-1 font-bold">MINT</span>
        </button>
      </div>

      {/* ================= NEW FIXED TOAST NOTIFICATION ================= */}
      {toast && (
        // CHANGED: top-4 to top-24 (so it drops below the header) and z-[999]
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-[999] w-full max-w-xs px-4 pointer-events-none">
          <div className={`p-4 rounded-lg shadow-2xl border backdrop-blur-xl flex items-center space-x-3 transition-all duration-300 ${
            toast.type === 'error' 
              ? 'bg-red-950/90 border-red-500/50 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
              : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.4)]'
          }`}>
            <div className="text-2xl">
              {toast.type === 'error' ? '⚠️' : '✅'}
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5">
                 {toast.type === 'error' ? 'SYSTEM ERROR' : 'TRANSACTION CONFIRMED'}
              </p>
              <p className="text-xs font-medium">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
      {/* ================================================================= */}

    </div>
  );
}

export default App