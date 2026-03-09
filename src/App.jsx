import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Terminal, Users, ShoppingCart, Zap, DollarSign, MapPin, Wallet, AlertTriangle, Crosshair, Signal } from 'lucide-react'
import * as h3 from 'h3-js';
import { usePrivy } from '@privy-io/react-auth';

// --- COMPONENTS ---
import MiningRig from './components/MiningRig'
import StatsPanel from './components/StatsPanel'
import MapTab from './components/MapTab';
import MissionBoard from './components/MissionBoard';
import Nomad from './components/Nomad';
import Uplink from './components/Uplink';
import Referral from './components/Referral';
import Inventory from './components/Inventory';
import Marketplace from './components/Marketplace';

// --- SERVICES ---
// Note: Ensure you created these files in src/services/
// If you haven't created them yet, the app will break.
import LocationService from './services/LocationService' 
import TelemetryService from './services/TelemetryService'

// --- HOOKS (Active Mapping) ---
import useActiveGPS from './hooks/useActiveGPS'

// --- CONFIGURATION ---
const BASE_MINING_RATE = 0.1; 
const HALVING_MULTIPLIER = 1.0; 
const GOD_MODE_DAILY_LIMIT = 10; 
const REFERRAL_RATE_PER_TICK = 0.003; 

// --- THE SEVEN SAGES HIERARCHY ---
const TIERS = [
    { id: 1, name: 'SCOUT', type: 'FREE', threshold: 0, multiplier: 1.0, bandwidth: 10, limitHours: 12, narrative: 'ENERGY DEPLETED', color: '#3b82f6', icon: '🦇', image: '/scout.png' },
    { id: 2, name: 'PRO BAT', type: 'RIG', threshold: 1000, multiplier: 1.2, bandwidth: 20, limitHours: 12, narrative: 'ENERGY DEPLETED', color: '#8b5cf6', icon: '🦇', image: '/pro_bat.png' },
    { id: 3, name: 'VAMPIRE', type: 'RIG', threshold: 5000, multiplier: 1.5, bandwidth: 50, limitHours: 12, narrative: 'ENERGY DEPLETED', color: '#ef4444', icon: '🧛', image: '/vampire.png' },
    { id: 4, name: 'DIVER', type: 'RIG', threshold: 20000, multiplier: 2.0, bandwidth: 200, limitHours: 10, narrative: 'OXYGEN DEPLETED', color: '#06b6d4', icon: '🐬', image: '/diver.png' },
    { id: 5, name: 'SURFER', type: 'RIG', threshold: 100000, multiplier: 3.0, bandwidth: 1000, limitHours: 10, narrative: 'OXYGEN DEPLETED', color: '#f59e0b', icon: '🐋', image: '/surfer.png' },
    { id: 6, name: 'ALLIANCE', type: 'RIG', threshold: 500000, multiplier: 5.0, bandwidth: 5000, limitHours: 8, narrative: 'OXYGEN DEPLETED', color: '#10b981', icon: '🔱', image: '/alliance.png' },
    { id: 7.1, name: 'APEX MK1', type: 'GOD', threshold: 1500000, multiplier: 10.0, bandwidth: 10000, limitHours: 8, narrative: 'SYSTEM OVERHEATED', color: '#f43f5e', icon: '👁️', image: '/apex1.png' },
    { id: 7.2, name: 'APEX MK2', type: 'GOD', threshold: 5000000, multiplier: 25.0, bandwidth: 25000, limitHours: 6, narrative: 'SYSTEM OVERHEATED', color: '#d946ef', icon: '🌀', image: '/apex2.png' },
    { id: 7.3, name: 'GOD EYE', type: 'GOD', threshold: 20000000, multiplier: 100.0, bandwidth: 100000, limitHours: 4, narrative: 'SYSTEM OVERHEATED', color: '#fbbf24', icon: '☀️', image: '/apex3.png' }
  ];

// --- BLACK MARKET CONSUMABLES ---
const CONSUMABLES = [
  // 🦇 BATS (Energy)
  { id: 'c_energy', name: 'ENERGY CELL', type: 'BAT', costRP: 1000, qty: 1, desc: 'Instantly recharges Scout/Bat/Vampire rigs. Bypasses 12h cooldown.', icon: '🔋', color: '#3b82f6' },
  { id: 'c_energy_bulk', name: 'BATTERY BUNDLE', type: 'BAT', costRP: 2500, qty: 3, desc: '3x Energy Cells. Save 16% on bulk purchase.', icon: '📦', color: '#3b82f6' },
  
  // 🐬 DOLPHINS (Oxygen)
  { id: 'c_o2', name: 'O2 TANK REFILL', type: 'DOLPHIN', costRP: 5000, qty: 1, desc: 'Instantly pressurizes Diver/Surfer/Alliance rigs. Bypasses 10h/8h cooldown.', icon: '🤿', color: '#06b6d4' },
  { id: 'c_o2_bulk', name: 'DEEP DIVE CRATE', type: 'DOLPHIN', costRP: 13500, qty: 3, desc: '3x O2 Refills. Save 10% on bulk purchase.', icon: '🌊', color: '#06b6d4' },
  
  // 👁️ APEX (Thermal)
  { id: 'c_cryo', name: 'LIQUID NITROGEN', type: 'APEX', costRP: 50000, qty: 1, desc: 'Instantly cools Apex Tier hardware. Bypasses strict God Eye cooldowns.', icon: '❄️', color: '#fbbf24' },
  { id: 'c_cryo_bulk', name: 'CRYO-CHAMBER', type: 'APEX', costRP: 135000, qty: 3, desc: '3x Liquid Nitrogen tanks. Save 10% on bulk purchase.', icon: '🧊', color: '#fbbf24' },
  
  // 💉 NEURAL INJECTIONS (Your Authentic Boosters)
  { id: 'cloud_relay_24h', name: 'CLOUD RELAY (24H)', type: 'BOOST', costRP: 500, qty: 1, desc: 'Maintains 100% mining rate while app is closed for 24 hours.', icon: '☁️', color: '#a855f7' },
  { id: 'cloud_relay_3d', name: 'CLOUD RELAY (3 DAYS)', type: 'BOOST', costRP: 1350, qty: 1, desc: 'Maintains 100% mining rate while app is closed for 72 hours.', icon: '🌥️', color: '#a855f7' },
  { id: 'cloud_relay_7d', name: 'HEAVY RELAY (7 DAYS)', type: 'BOOST', costRP: 2800, qty: 1, desc: 'Set it and forget it. 168 hours of uninterrupted offline mining.', icon: '🌩️', color: '#a855f7' },
  { id: 'signal_booster_1h', name: 'SIGNAL BOOSTER (1H)', type: 'BOOST', costRP: 200, qty: 1, desc: '+20% mining speed for 1 hour. Requires active uplink.', icon: '📡', color: '#10b981' },
  { id: 'botnet_injection', name: 'BOTNET INJECTION', type: 'BOOST', costRP: 1000, qty: 1, desc: 'Doubles the RP yield from your active referrals for 24 hours.', icon: '🦠', color: '#ef4444' },

  // 🚨 PREMIUM CONTRABAND (The Whale Exploits - Fiat/Crypto)
  { id: 'tw_bat', name: 'TIME-WARP (BAT)', type: 'PREMIUM', costUSD: 0.99, costCrypto: '0.2 TON', desc: 'Instantly bypass cooldown AND deposits 12h of Bat yield to your wallet.', icon: '⏳', color: '#a855f7' },
  { id: 'tw_dolphin', name: 'TIME-WARP (DOLPHIN)', type: 'PREMIUM', costUSD: 1.99, costCrypto: '0.4 TON', desc: 'Instantly bypass cooldown AND deposits 10h of Dolphin yield to your wallet.', icon: '⌛', color: '#d946ef' },
  { id: 'tw_apex', name: 'TIME-WARP (APEX)', type: 'PREMIUM', costUSD: 9.99, costCrypto: '2.0 TON', desc: 'Instantly bypass cooldown AND deposits 4h of God Eye yield to your wallet.', icon: '🌌', color: '#f43f5e' }
];

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function App() {
// --- STATE ---
  const [tab, setTab] = useState('TERMINAL');
  const [activeMode, setActiveMode] = useState('PASSIVE');
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState('IDLE');
  const [referralCount, setReferralCount] = useState(0);
  const [inventory, setInventory] = useState([]); // Stores purchased NFTs ['tier_2', etc.]
  const [toast, setToast] = useState(null); // { message: "Access Granted", type: "success" }
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [consumables, setConsumables] = useState({
  "c_energy": 0, "c_o2": 0, "c_cryo": 0, "tw_bat": 0, "tw_dolphin": 0, "tw_apex": 0
});
  const { user: privyUser, authenticated } = usePrivy();
  const [hasMainnetLicense, setHasMainnetLicense] = useState(false);

  // Ledger: real transaction history from localStorage (key: sonar_ledger)
  const [transactions, setTransactions] = useState(() => {
    try {
      const raw = localStorage.getItem('sonar_ledger');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const addTransaction = useCallback((type, amount, label) => {
    const id = Date.now();
    const timestamp = new Date().toISOString();
    const amountStr = String(amount);
    setTransactions((prev) => {
      const next = [{ id, type, amount: amountStr, label, timestamp }, ...prev].slice(0, 20);
      try {
        localStorage.setItem('sonar_ledger', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
    // NOMAD / UPLINK / CACHE / NETWORK rewards: credit balance and sync to Supabase
    if ((type === 'NOMAD' || type === 'UPLINK' || type === 'CACHE' || type === 'NETWORK') && amountStr.startsWith('+')) {
      const reward = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;
      if (reward > 0) {
        const newBalance = balanceRef.current + reward;
        setBalance(newBalance);
        balanceRef.current = newBalance;
        const safeUserId = user?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
        if (safeUserId) {
          supabase.from('users').update({ balance: newBalance }).eq('id', safeUserId).then(() => {});
        }
      }
    }
  }, [user]);

  const addTransactionRef = useRef(addTransaction);
  addTransactionRef.current = addTransaction;

  // Hourly mining ledger: flush earned RP to ledger every real hour
  const lastHourFlushRef = useRef(Date.now());
  const hourlyEarnedRef = useRef(0);

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
  const [locationData, setLocationData] = useState({ lat: 51.5074, lng: -0.1278, hex: "8a195da4992ffff" });
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

  // Calculate Tier based on OWNED ITEMS
  const currentTier = [...TIERS].reverse().find(t => 
    t.id === 1 || inventory.includes(`tier_${t.id}`)
  ) || TIERS[0];

  // 🚨 THE FIX: Find the actual NEXT tier in the hierarchy, regardless of balance
  const nextTierIndex = TIERS.findIndex(t => t.id === currentTier.id) + 1;
  const nextTier = nextTierIndex < TIERS.length ? TIERS[nextTierIndex] : null;
  
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
          // --- EXISTING USER: Load their saved data ---
          const safeBalance = Number(data.balance) || 0; 
          setBalance(safeBalance);
          balanceRef.current = safeBalance;
          
          // 🚨 NEW: Load their Mainnet License Status!
          setHasMainnetLicense(data.has_mainnet_license || false);
          
          // 🚨 THE SQUAD FIX: Fetch real downstream node count
          const { count: refCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('referred_by', currentUser.id);
            
          setReferralCount(refCount || 0);
          
          setInventory(data.inventory || []); 
          
          setConsumables(data.consumables || {
            "c_energy": 0, "c_o2": 0, "c_cryo": 0, "tw_bat": 0, "tw_dolphin": 0, "tw_apex": 0
          }); 
          
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

          if (data.cooldown_until) {
             const cooldownMs = new Date(data.cooldown_until).getTime();
             if (cooldownMs > Date.now()) {
                 setCooldownUntil(cooldownMs);
                 setIsOverheated(true);
                 setStatus('IDLE'); 
                 setGodModeElapsed(9999999);
                 godModeRef.current = 9999999; 
             }
          }

          setIsDataLoaded(true);
          
        } else {
          // --- NEW USER: Create account ---
          let referrerId = null;
          if (startParam && startParam.startsWith('ref_')) {
             referrerId = parseInt(startParam.split('_')[1]);
          }
          
          await supabase.from('users').insert({ 
            id: currentUser.id, 
            first_name: currentUser.first_name, 
            balance: 100,
            referred_by: referrerId,
            inventory: [] 
            // Note: We don't need to pass has_mainnet_license here because our SQL default handles it!
          });
          
          setBalance(100);
          balanceRef.current = 100;
          setInventory([]);
          
          // 🚨 NEW: Set to false for brand new users
          setHasMainnetLicense(false);
          
          setIsDataLoaded(true); 
        }
      }
    };

    // Trigger the boot sequence exactly ONCE
    init();
  }, []);

  // --- 2. TELEMETRY ENGINE (The "Ghost" Collector) ---
  useEffect(() => {
    // 1. ONE-TIME LOCATION FETCH
    const fetchLocation = async () => {
      const fallback = { lat: 51.5074, lng: -0.1278, hex: "8a195da4992ffff" };

      try {
         const loc = await LocationService.getHexId();
         
         // 🚨 CRITICAL MOBILE FIX: Catch 'latitude' vs 'lat' and force them to be Numbers
         const safeLat = Number(loc?.lat || loc?.latitude);
         const safeLng = Number(loc?.lng || loc?.longitude);

         // Only set it if it's a real, valid number
         if (!isNaN(safeLat) && !isNaN(safeLng) && safeLat !== 0) {
           setLocationData({ lat: safeLat, lng: safeLng, hex: loc?.hex || "8a195da4992ffff" });
           setCityNodeCount(Math.floor(Math.random() * 500) + 100); 
         } else {
           console.warn("⚠️ Invalid Mobile GPS format. Using Fallback.");
           setLocationData(fallback); 
           setCityNodeCount(42);
         }
      } catch (e) {
         console.warn("⚠️ Loc Service Blocked. Using Fallback.");
         setLocationData(fallback); 
         setCityNodeCount(42);
      }
    };

    // Trigger location fetch exactly ONCE
    fetchLocation();

    // 2. REPEATING SIGNAL FETCH
    const collectSignal = async () => {
      try {
         const netStats = await TelemetryService.getNetworkStats();
         setSignalStrength(netStats.type === 'wifi' || netStats.type === '4g' ? 'STRONG' : 'WEAK');
      } catch (e) {
         setSignalStrength('WEAK'); // Fallback signal
      }
    };
    
    collectSignal();
    
    // Refresh signal stats every 30s
    const signalInterval = setInterval(collectSignal, 30000);
    return () => clearInterval(signalInterval);
    
  // 🚨 FIX: Empty array! This guarantees the hook only mounts ONCE and never loops.
  }, []);

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

  // --- INVISIBLE WEB3 SYNC ---
  useEffect(() => {
    // 1. Hunt for the Solana address just like we did in the Inventory tab
    const walletAddress = 
      privyUser?.wallet?.address || 
      privyUser?.linkedAccounts?.find(a => a.type === 'wallet' && a.walletClientType === 'privy' && a.chainType === 'solana')?.address ||
      privyUser?.linkedAccounts?.find(a => a.type === 'wallet' && a.walletClientType === 'privy')?.address;

    // 2. Grab their Telegram ID
    const safeUserId = user?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;

    // 3. If both exist, silently update their Supabase profile
    if (authenticated && walletAddress && safeUserId) {
      const syncWalletToDatabase = async () => {
        const { error } = await supabase
          .from('users')
          .update({ wallet_address: walletAddress })
          .eq('id', safeUserId);
        
        if (error) {
          console.error("Failed to sync Web3 wallet to database:", error);
        } else {
          console.log("Web3 Wallet synced to Supabase successfully.");
        }
      };
      
      syncWalletToDatabase();
    }
  }, [authenticated, privyUser, user]);

  // --- MAINNET ACTIVATION HANDLER ---
  const handleActivateMainnet = async () => {
    // 1. Optimistic UI Update (Instantly turn the card green for the user)
    setHasMainnetLicense(true);
    
    // Optional: Give them a 5,000 RP rebate instantly as a thank you!
    setBalance(prev => prev + 5000); 

    const safeUserId = user?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (!safeUserId) return;

    // 2. Permanently save it to the database
    const { error } = await supabase
      .from('users')
      .update({ 
        has_mainnet_license: true,
        balance: balance + 5000 // Update their DB balance with the rebate
      })
      .eq('id', safeUserId);

    if (error) {
      console.error("Failed to save Mainnet License to DB:", error);
      // In a production app, you might want to retry this if it fails!
    } else {
      console.log("Mainnet License permanently secured in database.");
    }
  };

  // --- 3.5. CONSUMABLES: BYPASS COOLDOWN ---
  const buyConsumable = async () => {
      // Apex pay 50k, Alliance/Dolphins pay 5k, Bats pay 1k
      const cost = currentTier.id >= 7 ? 50000 : currentTier.id >= 4 ? 5000 : 1000;
      
      if (balanceRef.current < cost) {
          // (Optional) You can change showToast to whatever notification system you use
          console.log(`⚠️ INSUFFICIENT FUNDS. NEED ${cost} RP.`); 
          return;
      }

      // 1. Deduct Balance instantly on screen
      setBalance(prev => prev - cost);
      balanceRef.current -= cost;

      // 2. Instantly Reset Locks
      setIsOverheated(false);
      setCooldownUntil(null);
      setGodModeElapsed(0);
      godModeRef.current = 0;
      setStatus('IDLE');

      // 3. Save to Database
      const safeUserId = user?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if (safeUserId) {
          await supabase.from('users').update({
              balance: balanceRef.current,
              cooldown_until: null
          }).eq('id', safeUserId);
          console.log(`✅ BYPASS PURCHASED. UPLINK READY.`);
      }
  };

  // --- BLACK MARKET: BUY CONSUMABLES ---
  const buyBlackMarketItem = async (item, autoDeploy = false) => {
      // 1. Handle Fiat/Crypto Gateway
      if (item.type === 'PREMIUM') {
          console.log(`Routing to crypto payment for ${item.costCrypto}...`);
          return;
      }

      // 2. Check RP Balance
      if (balanceRef.current < item.costRP) {
          console.log(`Not enough RP for ${item.name}`);
          // showToast("⚠️ INSUFFICIENT RP.", "error");
          return;
      }

      const now = Date.now();
      const HOUR = 60 * 60 * 1000;
      const DAY = 24 * HOUR;

      // 3. Deduct RP
      const newBalance = balanceRef.current - item.costRP;
      setBalance(newBalance);
      balanceRef.current = newBalance;

      // 4. Update the Backpack (JSON Object)
      const baseId = item.id.replace('_bulk', ''); 
      
      // Math: Add the purchased amount. If auto-deploying, instantly consume 1!
      const newQty = (consumables[baseId] || 0) + item.qty;
      const finalQty = autoDeploy ? newQty - 1 : newQty;

      const updatedConsumables = {
          ...consumables,
          [baseId]: finalQty
      };
      setConsumables(updatedConsumables);

      // 5. Prepare Database Payload
      const dbUpdate = { 
          balance: newBalance, 
          consumables: updatedConsumables 
      };

      // 6. 🚨 AUTO-DEPLOY LOGIC 🚨 (Now perfectly synced with State & DB!)
      if (autoDeploy) {
          if (item.type === 'BAT' || item.type === 'DOLPHIN' || item.type === 'APEX') {
              if (!isOverheated && (!cooldownUntil || cooldownUntil < now)) {
                  console.log("⚠️ SYSTEM ALREADY COOL. Purchase stashed instead.");
                  // They accidentally injected a cool system. Let's be nice and stash it instead of wasting it!
                  setConsumables({ ...consumables, [baseId]: newQty });
                  dbUpdate.consumables = { ...consumables, [baseId]: newQty };
              } else {
                  setIsOverheated(false);
                  setCooldownUntil(null);
                  setGodModeElapsed(0);
                  godModeRef.current = 0;
                  setStatus('IDLE');
                  dbUpdate.cooldown_until = null; 
                  console.log(`✅ ${item.name} Auto-Deployed: System Restored.`);
              }
          } 
          else if (item.id.includes('signal_booster')) {
              const newTime = Math.max(now, boosterExpiry || 0) + HOUR;
              setBoosterExpiry(newTime); // 🚨 TRIGGERS UI BADGE
              dbUpdate.booster_expiry = new Date(newTime).toISOString(); // 🚨 TELLS PYTHON
              console.log(`📡 Signal Booster Active for 1 Hour!`);
          } 
          else if (item.id.includes('botnet_injection')) {
              const newTime = Math.max(now, botnetExpiry || 0) + DAY;
              setBotnetExpiry(newTime); // 🚨 TRIGGERS UI BADGE
              dbUpdate.botnet_expiry = new Date(newTime).toISOString(); // 🚨 TELLS PYTHON
              console.log(`🦠 Botnet Active for 24 Hours!`);
          }
          else if (item.id.includes('cloud_relay')) {
              const days = item.id.includes('7d') ? 7 : item.id.includes('3d') ? 3 : 1;
              const newTime = Math.max(now, relayExpiry || 0) + (days * DAY);
              setRelayExpiry(newTime);
              dbUpdate.relay_expiry = new Date(newTime).toISOString();
              console.log(`☁️ Cloud Relay Active!`);
          }
      }

      // 7. Save to Supabase
      const safeUserId = (typeof currentUser !== 'undefined' && currentUser?.id) 
                      || (typeof user !== 'undefined' && user?.id) 
                      || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
                      
      if (safeUserId) {
          const { error } = await supabase.from('users').update(dbUpdate).eq('id', safeUserId);
          if (!error) {
              console.log(`✅ Purchase Saved. Auto-Deploy: ${autoDeploy}`);
              addTransaction('BUY', `-${item.costRP}`, item.name);
          } else {
              console.error("❌ DB Save Error:", error.message);
          }
      }
  };

  // --- INVENTORY: DEPLOY CONSUMABLE ---
  const deployConsumable = async (item) => {
      const baseId = item.id.replace('_bulk', ''); // Safety check
      if (!consumables[baseId] || consumables[baseId] <= 0) {
          // showToast("⚠️ INSUFFICIENT INVENTORY.", "error");
          return false;
      }

      const now = Date.now();
      const HOUR = 60 * 60 * 1000;
      const DAY = 24 * HOUR;

      // 1. Deduct from backpack instantly
      const updatedConsumables = {
          ...consumables,
          [baseId]: consumables[baseId] - 1
      };
      setConsumables(updatedConsumables);

      // 2. Prepare Database Payload
      const dbUpdate = { consumables: updatedConsumables };

      // 3. Apply the specific item effect!
      if (item.type === 'BAT' || item.type === 'DOLPHIN' || item.type === 'APEX') {
          // It's a cooling/recharge item! Reset the rig.
          if (!isOverheated && (!cooldownUntil || cooldownUntil < now)) {
              console.log("⚠️ SYSTEM IS ALREADY COOL. SAVE YOUR ITEM.");
              // Put the item back!
              setConsumables(consumables); 
              return false; 
          }
          
          setIsOverheated(false);
          setCooldownUntil(null);
          setGodModeElapsed(0);
          godModeRef.current = 0;
          setStatus('IDLE');
          dbUpdate.cooldown_until = null; // Tell Supabase to unlock them
          console.log(`✅ ${item.name} DEPLOYED: System Restored.`);
          // showToast(`✅ ${item.name} DEPLOYED: SYSTEM RESTORED.`, "success");
          
      } 
      else if (item.id === 'signal_booster_1h') {
          const newTime = Math.max(now, boosterExpiry || 0) + HOUR;
          setBoosterExpiry(newTime); // 🚨 STATE: Triggers the UI Badge!
          dbUpdate.booster_expiry = new Date(newTime).toISOString(); // 🚨 DB: Tells Python!
          console.log(`📡 Signal Booster Active for 1 Hour!`);
          // showToast(`📡 SIGNAL BOOSTER DEPLOYED! (+1 HOUR)`, "success");
      } 
      else if (item.id === 'botnet_injection') {
          const newTime = Math.max(now, botnetExpiry || 0) + DAY;
          setBotnetExpiry(newTime); // 🚨 STATE: Triggers the UI Badge!
          dbUpdate.botnet_expiry = new Date(newTime).toISOString(); // 🚨 DB: Tells Python!
          console.log(`🦠 Botnet Active for 24 Hours!`);
          // showToast(`🦠 BOTNET DEPLOYED! (24H ACTIVE)`, "success");
      }
      else if (item.id === 'cloud_relay_24h' || item.id === 'cloud_relay_3d' || item.id === 'cloud_relay_7d') {
          // Extract the days from the ID (default to 1 day)
          const days = item.id.includes('7d') ? 7 : item.id.includes('3d') ? 3 : 1;
          const newTime = Math.max(now, relayExpiry || 0) + (days * DAY);
          setRelayExpiry(newTime);
          dbUpdate.relay_expiry = new Date(newTime).toISOString();
          console.log(`☁️ Cloud Relay Active!`);
          // showToast(`☁️ CLOUD RELAY DEPLOYED!`, "success");
      }

      // 4. Save to Database
      const safeUserId = (typeof currentUser !== 'undefined' && currentUser?.id) 
                      || (typeof user !== 'undefined' && user?.id) 
                      || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
                      
      if (safeUserId) {
          const { error } = await supabase.from('users').update(dbUpdate).eq('id', safeUserId);
          if (error) {
              console.error("❌ DB SAVE FAILED:", error.message);
              // showToast("❌ DATABASE SYNC FAILED.", "error");
          }
      }
      
      return true; // Tells the UI the deployment was a success
  };

  // --- 4. MINING TOGGLE ---
  const toggleMining = () => {
    if (status === 'MINING') {
      setStatus('IDLE');
      clearInterval(miningInterval.current);
      clearInterval(godModeRef.current); 
    } else {
      setStatus('MINING');
      lastHourFlushRef.current = Date.now();
      hourlyEarnedRef.current = 0;

      miningInterval.current = setInterval(() => {
        const now = Date.now();
        const loadFactor = (Math.random() * 0.2) + 0.8; 
        
        // --- UNIVERSAL TIER LIMITS & COOLDOWN ENGINE ---
        const timeMultiplier = 3600; 
        const safeLimitHours = currentTier?.limitHours || (30 / 3600); 
        const DAILY_LIMIT_SECONDS = safeLimitHours * timeMultiplier; 
        const COOLDOWN_HOURS = 24 - safeLimitHours; 

        // 1. CHECK IF LIMIT REACHED
        if (godModeRef.current >= DAILY_LIMIT_SECONDS) {
            godModeRef.current = DAILY_LIMIT_SECONDS; 
            setGodModeElapsed(DAILY_LIMIT_SECONDS);
            
            setStatus('IDLE'); 
            setIsOverheated(true); 
            
            const safeUserId = (typeof currentUser !== 'undefined' && currentUser?.id) 
                            || (typeof user !== 'undefined' && user?.id) 
                            || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
                            
            const cooldownTime = Date.now() + (COOLDOWN_HOURS * 60 * 60 * 1000); 
            
            setCooldownUntil(prev => {
                if (!prev || prev < Date.now()) return cooldownTime;
                return prev;
            });

            // 🚨 THE CRASH FIX: Convert the number to an ISO String for Supabase!
            if (safeUserId) {
                supabase.from('users')
                  .update({ cooldown_until: new Date(cooldownTime).toISOString() }) 
                  .eq('id', safeUserId)
                  .then(({ error }) => {
                     if (error) console.error("❌ DB SAVE FAILED:", error.message);
                     else console.log(`✅ RIG LOCKED IN DB UNTIL:`, new Date(cooldownTime).toLocaleTimeString());
                  });
            }
            return; 
        }
        
        // 2. TICK UP NORMALLY
        godModeRef.current += 0.1; 
        setGodModeElapsed(Math.floor(godModeRef.current));
        
        // --- 3. UNIFIED OPTIMISTIC UI MATH ---
        
        // A. Start with the smart multiplier (drops to 0 if overheated)
        let tickMult = effectiveMultiplier;

        // B. 📡 APPLY SIGNAL BOOSTER INSTANTLY (+20%)
        if (boosterRef.current && boosterRef.current > now) {
            tickMult *= 1.2;
        }

        // C. Calculate Mining Payout (Divide by 10 because 100ms is 1/10th of a second)
        const miningEarned = (BASE_MINING_RATE * tickMult * loadFactor * HALVING_MULTIPLIER) / 10;
        
        // D. 🦠 APPLY BOTNET INJECTION INSTANTLY (2x Yield)
        let refMult = 1.0;
        if (botnetRef.current && botnetRef.current > now) {
            refMult = 2.0;
        }
        
        // Calculate Referral Payout (Divide by 10 for the 100ms tick)
        const referralEarned = (activeReferrals * REFERRAL_RATE_PER_TICK * refMult) / 10;
        
        // E. Final Math Application
        const totalEarned = miningEarned + referralEarned;
        const newBal = parseFloat((balanceRef.current + totalEarned).toFixed(4));
        
        setBalance(newBal);
        balanceRef.current = newBal;

        // Hourly ledger: accumulate and flush every real hour
        hourlyEarnedRef.current += totalEarned;
        if (now - lastHourFlushRef.current >= 3600000) {
          const amount = hourlyEarnedRef.current.toFixed(2);
          if (Number(amount) > 0) {
            addTransactionRef.current('MINE', `+${amount}`, 'Hourly Yield');
          }
          hourlyEarnedRef.current = 0;
          lastHourFlushRef.current = now;
        }
      }, 100); 
    }
  };

  const handleInvite = () => {
    if (!user) return;
    
    const botUsername = 'RIM_Protocol_Bot'; 
    // Uses your exact startapp format
    const inviteLink = `https://t.me/${botUsername}/start?startapp=ref_${user.id}`;
    
    // Updated to Sonar Rim!
    const text = `Join the Sonar Rim network. Activate your node.`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;

    if (window.Telegram?.WebApp) {
      // 🚨 THE UPGRADE: Smooth native Telegram sharing overlay
      window.Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      // Fallback for desktop browser testing
      window.open(shareUrl, '_blank');
    }
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

  // --- ACTIVE MAPPING: Reward when user moves 50m (Standard Drop) ---
  const ACTIVE_MAP_BOUNTY_RP = 50;
  
  const handleLocationReward = async (distance, coords) => {
    const safeUserId = user?.id || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if (!safeUserId) return;

    // 1. Calculate their exact Hexagon Sector (Resolution 9)
    const h3Sector = h3.latLngToCell(coords.lat, coords.lng, 9);

    // 2. 🛑 GEOFENCING CHECK: Is this a restricted zone?
    // We ask Supabase if this exact H3 string exists in our blacklist table.
    const { data: restrictedZone } = await supabase
      .from('restricted_zones')
      .select('h3_index, description')
      .eq('h3_index', h3Sector)
      .maybeSingle();

    if (restrictedZone) {
      // User is in a danger zone! Stop the function. No RP, no data saved.
      showToast(`🛑 RESTRICTED ZONE: ${restrictedZone.description || 'Tracking Paused'}`, 'error');
      return; 
    }

    // 3. 💰 SAFE ZONE: Give them their RP
    const newBalance = balanceRef.current + ACTIVE_MAP_BOUNTY_RP;
    setBalance(newBalance);
    balanceRef.current = newBalance;

    addTransaction('MAPPING', `+${ACTIVE_MAP_BOUNTY_RP}`, 'Sector Mapped (50m)');

    await supabase.from('users').update({ balance: balanceRef.current }).eq('id', safeUserId);

    // 4. 📡 MONETIZATION: Save the GPS footprint for B2B sales
    const { error: telemetryError } = await supabase.from('map_telemetry').insert({
      user_id: safeUserId,
      lat: coords.lat,
      lng: coords.lng,
      h3_index: h3Sector
    });

    if (telemetryError) {
      console.error("Failed to save telemetry data:", telemetryError);
    } else {
      showToast(`📍 +${ACTIVE_MAP_BOUNTY_RP} RP | Data Uploaded`, 'success');
    }

    // Zone Stub: future GPS Booster (multiplier timer in Supabase instead of flat payout)
    // if (isUnexploredZone(coords)) {
    //   await supabase.from('users').update({ booster_expiry: ... }).eq('id', safeUserId);
    // }
  };

  const {
    currentLocation: activeGPSLocation,
    distanceTraveled: activeGPSDistance,
    isTracking: isActiveGPSTracking,
    isSpeeding: activeGPSIsSpeeding,
    startTracking: startActiveGPS,
    stopTracking: stopActiveGPS,
    permissionState: activeGPSPermission,
    permissionError: activeGPSError,
  } = useActiveGPS({
    onSignificantLocationChange: handleLocationReward,
    thresholdMeters: 50,
  });
  
 // ==========================================
  // Calculates time left for the Cooldown Timer
  const getCooldownDisplay = () => {
    if (!cooldownUntil) return null;
    
    // 🚨 THE FIX: Force the value (whether string or number) into a pure millisecond timestamp!
    const targetTime = new Date(cooldownUntil).getTime();
    const left = targetTime - Date.now();
    
    // Safety net: If the math fails or time is up, return null to clear the timer
    if (isNaN(left) || left <= 0) return null; 

    const h = Math.floor(left / (1000 * 60 * 60));
    const m = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((left % (1000 * 60)) / 1000);
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleBuyItem = async (item) => {
    // 1. 🚨 STRIP TEXT AND FIND THE REAL COST (Checks both price and threshold)
    const rawCost = item.price !== undefined ? item.price : item.threshold;
    // This turns "16,000,000 RP" into pure 16000000
    const cost = typeof rawCost === 'number' ? rawCost : parseInt(String(rawCost).replace(/[^0-9]/g, ''), 10) || 0;

    // 2. Check if they have enough balance
    if (balanceRef.current < cost) {
      // showToast("⚠️ INSUFFICIENT RP BITS. KEEP MINING.", "error");
      console.log(`⚠️ INSUFFICIENT FUNDS. NEED ${cost} RP.`);
      return;
    }

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    // 3. Pre-calculate the new balance safely
    const newBalance = balanceRef.current - cost;
    
    // This payload will hold EXACTLY what we send to the database
    let updatePayload = { balance: newBalance };

    // 4. Prepare the data based on what they are buying
    if (item.type === 'CONSUMABLE') {
      if (item.id === 'cloud_relay_24h') {
        const newTime = Math.max(now, relayExpiry || 0) + DAY;
        setRelayExpiry(newTime);
        localStorage.setItem('relayExpiry', newTime.toString());
        updatePayload.relay_expiry = new Date(newTime).toISOString(); 
      } else if (item.id === 'cloud_relay_3d') {
        const newTime = Math.max(now, relayExpiry || 0) + (3 * DAY);
        setRelayExpiry(newTime);
        localStorage.setItem('relayExpiry', newTime.toString());
        updatePayload.relay_expiry = new Date(newTime).toISOString(); 
      } else if (item.id === 'cloud_relay_7d') {
        const newTime = Math.max(now, relayExpiry || 0) + (7 * DAY);
        setRelayExpiry(newTime);
        localStorage.setItem('relayExpiry', newTime.toString());
        updatePayload.relay_expiry = new Date(newTime).toISOString(); 
      } else if (item.id === 'signal_booster_1h') {
        const newTime = Math.max(now, boosterExpiry || 0) + HOUR;
        setBoosterExpiry(newTime);
        localStorage.setItem('boosterExpiry', newTime.toString());
        updatePayload.booster_expiry = newTime; 
      } else if (item.id === 'botnet_injection') {
        const newTime = Math.max(now, botnetExpiry || 0) + DAY;
        setBotnetExpiry(newTime);
        localStorage.setItem('botnetExpiry', newTime.toString());
        updatePayload.botnet_expiry = newTime; 
      }
      
    } else if (item.type === 'RIG' || item.type === 'GOD' || item.threshold) {
      if (inventory.includes(item.id)) {
        // showToast("⚠️ YOU ALREADY OWN THIS RIG.", "error");
        return; 
      }
      const newInventory = [...inventory, item.id];
      setInventory(newInventory);
      updatePayload.inventory = newInventory;
    }

    // 5. 🚨 THE ATOMIC DATABASE UPDATE 🚨
    // Using safeUserId so it never fails on Telegram mobile
    const safeUserId = (typeof user !== 'undefined' && user?.id) || window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    
    if (!safeUserId) {
        console.error("❌ No User ID found!");
        return;
    }

    const { error } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', safeUserId);

    // If Supabase rejects it, we stop everything and keep their money safe.
    if (error) {
      console.error("Purchase failed:", error.message);
      // showToast("❌ TRANSACTION FAILED. SERVER ERROR.", "error");
      return;
    }

    // 6. ONLY if the database accepts it, we update the visual balance!
    setBalance(newBalance);
    balanceRef.current = newBalance;

    // 7. Show the Success Toast
    if (item.type === 'RIG' || item.type === 'GOD' || item.threshold) {
      // showToast(`🦇 ${item.name} ACQUIRED! Multiplier Upgraded.`, "success");
      console.log(`✅ RIG ACQUIRED: ${item.name}`);
    } else {
      // showToast(`✅ ${item.name} ACTIVATED!`, "success");
      console.log(`✅ CONSUMABLE ACTIVATED: ${item.name}`);
    }
  };

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
              // 🚨 THE FIX: Find the index of the CURRENT tier, and just grab the next one!
              const currentIndex = TIERS.findIndex(t => t.id === currentTier.id);
              const nextTier = currentIndex >= 0 && currentIndex < TIERS.length - 1 
                  ? TIERS[currentIndex + 1] 
                  : null;
              
              if (!nextTier) return <p className="text-[8px] text-cyan-400 mt-1 font-bold tracking-widest uppercase animate-pulse">MAX TIER REACHED</p>;
              
              const rawPrice = typeof nextTier.threshold === 'number' ? nextTier.threshold : parseInt(nextTier.threshold.toString().replace(/[^0-9]/g, ''));
              const progress = Math.min(100, (balance / rawPrice) * 100);

              return (
                <div className="w-full mt-2">
                   <div className="flex justify-between text-[8px] text-gray-500 mb-1 tracking-widest uppercase">
                      <span>NEXT: {nextTier.name}</span>
                      <span>{Math.floor(progress)}%</span>
                   </div>
                   <div className="w-full h-1 bg-gray-900 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                   </div>
                   <div className="text-[7px] text-right text-gray-600 mt-1 font-mono">
                      {Math.floor(balance).toLocaleString()} / {rawPrice.toLocaleString()} RP
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

        {tab === 'MISSIONS' ? (
           <MissionBoard setActiveMode={setActiveMode} setTab={setTab} />
        ) : tab === 'NOMAD' ? (
           <Nomad addTransaction={addTransaction} setTab={setTab} />
        ) : tab === 'UPLINK' ? (
           <Uplink addTransaction={addTransaction} setTab={setTab} />
        ) : tab === 'MAP' ? (
           <MapTab 
              locationData={locationData} 
              cityNodeCount={cityNodeCount}
              isActiveGPSTracking={isActiveGPSTracking}
              startActiveGPS={startActiveGPS}
              stopActiveGPS={stopActiveGPS}
              activeGPSDistance={activeGPSDistance}
              activeGPSError={activeGPSError}
              activeGPSLocation={activeGPSLocation}
              activeGPSIsSpeeding={activeGPSIsSpeeding}
              addTransaction={addTransaction}
           />
        ) : tab === 'WALLET' ? (
           <Inventory 
              balance={balance} 
              currentTier={currentTier} 
              referralCount={referralCount}
              consumables={consumables} 
              CONSUMABLES={CONSUMABLES} 
              deployConsumable={deployConsumable}
              transactions={transactions}
              hasMainnetLicense={hasMainnetLicense}
              onActivateMainnet={handleActivateMainnet}
           />
        ) : tab === 'MARKET' ? (
           <Marketplace 
              TIERS={TIERS}                           // Need this to map the hardware
              CONSUMABLES={CONSUMABLES}               // Need this to map the contraband
              balance={balance}                       // Checks if they can afford items
              userInventory={inventory}               // Checks if they already own a rig
              onBuyItem={handleBuyItem}               // Your OLD function to buy a Rig
              buyBlackMarketItem={buyBlackMarketItem}
           />
        ) : tab === 'SQUAD' ? (
           <Referral
              addTransaction={addTransaction}
              hasBotnetActive={botnetExpiry != null && botnetExpiry > Date.now()}
              referralCount={referralCount}
              currentTier={currentTier}
              onInvite={handleInvite}
           />
        ) : (tab === 'TERMINAL' || tab === 'RIG') ? (
           <>
              {(!currentTier || !currentTier.name) ? (
                <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 bg-red-950/80 border-2 border-red-500 rounded-xl text-red-400 text-center mx-4">
                  <p className="text-sm font-black tracking-widest uppercase">CONNECTION ERROR</p>
                  <p className="text-[10px] mt-2 text-red-300/80">Rig data unavailable. Return to Grid or refresh.</p>
                </div>
              ) : (
           <>
              {/* UNIVERSAL STABILITY BAR (Now shows for all tiers!) */}
              <div className="absolute top-4 w-full px-12 z-20">
                 <div className="flex justify-between text-[8px] font-bold tracking-widest mb-1">
                    <span className={isOverheated ? 'text-red-500 animate-pulse' : 'text-gray-500'}>
                       {isOverheated ? (currentTier.narrative || 'OVERHEATED') : `${currentTier.name || 'RIG'} STABILITY`}
                    </span>
                    <span className="text-gray-500">
                       {Math.floor((godModeElapsed / ((currentTier.limitHours || 12) * 3600)) * 100)}%
                    </span>
                 </div>
                 <div className="w-full h-1 bg-gray-900 rounded-full">
                    <div 
                       className={`h-full rounded-full transition-all duration-1000 ${isOverheated ? 'bg-red-500' : 'bg-cyan-400'}`} 
                       style={{ width: `${Math.min(100, (godModeElapsed / ((currentTier.limitHours || 12) * 3600)) * 100)}%` }}
                    ></div>
                 </div>
              </div>

              {/* THE NEW FLOATING MINING RIG (Replaces the old <MiningRig /> tag) */}
              <div 
                // 🚨 CHANGED: Disable the pointer if we are on cooldown!
                className={`flex flex-col items-center justify-center relative w-full max-w-sm mt-8 mb-4 ${
                  isOverheated || (cooldownUntil && cooldownUntil > Date.now()) 
                    ? 'cursor-not-allowed' 
                    : 'cursor-pointer'
                }`} 
                onClick={() => {
                  if (isOverheated || (cooldownUntil && cooldownUntil > Date.now())) {
                    showToast(`⚠️ ${currentTier?.narrative || 'OVERHEATED'}. PLEASE WAIT OR RECHARGE.`);
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
                      src={currentTier.image || '/scout.png'} 
                      alt={currentTier.name || 'Rig'}
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
                   <span className={`px-5 py-2 rounded-full text-[11px] font-black tracking-widest border transition-colors duration-500 ${
                      isOverheated || (cooldownUntil && cooldownUntil > Date.now()) 
                        ? 'bg-red-900/50 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' :
                      status === 'MINING' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 
                      'bg-gray-900 border-gray-700 text-gray-500'
                   }`}>
                      {isOverheated || (cooldownUntil && cooldownUntil > Date.now()) 
                        ? `LOCKOUT: ${getCooldownDisplay()}` 
                        : status === 'MINING' ? 'UPLINK ACTIVE' : 'SYSTEM OFFLINE'}
                   </span>
                </div>
              </div>

              {/* 🚨 THE EMERGENCY QUICK-BUY BUTTON (Now Glowing Green!) */}
              {(isOverheated || (cooldownUntil && cooldownUntil > Date.now())) && (
                 <div className="mt-2 mb-6 z-30 flex flex-col items-center">
                    <button 
                       onClick={buyConsumable}
                       className="px-6 py-3 bg-green-900/30 border border-green-500 text-green-400 font-bold rounded-lg text-[10px] tracking-[0.2em] animate-pulse hover:bg-green-800/50 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                    >
                       {currentTier.id >= 7 ? 'INJECT LIQUID NITROGEN (-50,000 RP)' : 
                        currentTier.id >= 4 ? 'BUY O2 TANK REFILL (-5,000 RP)' : 
                        'BUY ENERGY CELL (-1,000 RP)'}
                    </button>
                    <p className="text-[8px] text-gray-500 mt-2 uppercase tracking-widest">
                       Or visit the Black Market for bulk supplies
                    </p>
                 </div>
              )}

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
           </>
        ) : null}
      </div>

      {/* FOOTER */}
      <div className="grid grid-cols-6 border-t border-gray-900 bg-black pb-8 z-50 bg-black">
        <button onClick={() => setTab('TERMINAL')} className={`p-3 flex flex-col items-center ${tab === 'TERMINAL' ? 'text-white' : 'text-gray-600'}`}>
          <Terminal size={18} /><span className="text-[8px] mt-1 font-bold">GRID</span>
        </button>
        <button onClick={() => setTab('MISSIONS')} className={`p-3 flex flex-col items-center ${tab === 'MISSIONS' ? 'text-white' : 'text-gray-600'}`}>
          <Crosshair size={18} /><span className="text-[8px] mt-1 font-bold">MISSIONS</span>
        </button>
        <button onClick={() => setTab('MAP')} className={`p-3 flex flex-col items-center ${tab === 'MAP' ? 'text-white' : 'text-gray-600'}`}>
          <MapPin size={18} /><span className="text-[8px] mt-1 font-bold">MAP</span>
        </button>
        <button onClick={() => setTab('WALLET')} className={`p-3 flex flex-col items-center ${tab === 'WALLET' ? 'text-white' : 'text-gray-600'}`}>
          <Wallet size={18} /><span className="text-[8px] mt-1 font-bold">WALLET</span>
        </button>
        <button onClick={() => setTab('SQUAD')} className={`p-3 flex flex-col items-center ${tab === 'SQUAD' ? 'text-white' : 'text-gray-600'}`}>
          <Users size={18} /><span className="text-[8px] mt-1 font-bold">SQUAD</span>
        </button>
        <button onClick={() => setTab('MARKET')} className={`p-3 flex flex-col items-center ${tab === 'MARKET' ? 'text-white' : 'text-gray-600'}`}>
          <ShoppingCart size={18} /><span className="text-[8px] mt-1 font-bold">MARKET</span>
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
};

export default App