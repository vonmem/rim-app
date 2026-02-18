import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Terminal, Users, Zap, DollarSign, MapPin, Signal, Wallet } from 'lucide-react'

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
const GOD_MODE_DAILY_LIMIT = 4 * 60 * 60; 
const REFERRAL_RATE_PER_TICK = 0.003; 

// --- THE SEVEN SAGES HIERARCHY ---
const TIERS = [
  { id: 1, name: 'SCOUT', threshold: 0, color: '#9CA3AF', multiplier: 1.0, icon: '🦇', supply: '∞', price: 'FREE', type: 'COMMON', bandwidth: 10 },
  { id: 2, name: 'HIGH-FLYER', threshold: 1000, color: '#D1D5DB', multiplier: 1.2, icon: '🦇', supply: '∞', price: '$20', type: 'UNCOMMON', bandwidth: 25 },
  { id: 3, name: 'VAMPIRE', threshold: 5000, color: '#EF4444', multiplier: 1.5, icon: '🧛', supply: '6,000', price: '$99', type: 'RARE', bandwidth: 50 },
  { id: 4, name: 'DIVER DOLPHIN', threshold: 20000, color: '#3B82F6', multiplier: 2.0, icon: '🐬', supply: '2,000', price: '$499', type: 'RARE', bandwidth: 100 },
  { id: 5, name: 'SURFER DOLPHIN', threshold: 100000, color: '#8B5CF6', multiplier: 3.0, icon: '🐋', supply: '600', price: '$1,499', type: 'EPIC', bandwidth: 250 },
  { id: 6, name: 'SUPER-ALLIANCE', threshold: 500000, color: '#FCD34D', multiplier: 5.0, icon: '🔱', supply: '200', price: '$4,999', type: 'LEGENDARY', bandwidth: 500 },
  { id: 7.1, name: 'APEX MK1', threshold: 1500000, color: '#F59E0B', multiplier: 10.0, icon: '👁️', supply: '60', price: '$15K', type: 'MYTHIC', bandwidth: 1000 },
  { id: 7.2, name: 'APEX MK2', threshold: 5000000, color: '#DC2626', multiplier: 25.0, icon: '👁️', supply: '20', price: '$50K', type: 'MYTHIC', bandwidth: 1000 },
  { id: 7.3, name: 'APEX MK3 GOD EYE', threshold: 20000000, color: '#FFFFFF', multiplier: 100.0, icon: '🧿', supply: '8', price: 'AUCTION', type: 'ARTIFACT', bandwidth: 1000 },
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
  const [inventory, setInventory] = useState([]); // Stores ['tier_2', 'cloud_relay', etc.] 

  // Telemetry State (The "Fog of War" Data)
  const [locationData, setLocationData] = useState(null);
  const [signalStrength, setSignalStrength] = useState('UNKNOWN');
  const [cityNodeCount, setCityNodeCount] = useState(0); // Simulated "Nodes in your city"

  // Overheat State
  const [godModeElapsed, setGodModeElapsed] = useState(0);
  const [isOverheated, setIsOverheated] = useState(false);

  // Refs
  const balanceRef = useRef(0);
  const godModeRef = useRef(0);
  const miningInterval = useRef(null);

  // Calculate Tier based on OWNED ITEMS, not Balance
  const currentTier = [...TIERS].reverse().find(t => 
    t.id === 1 || inventory.includes(`tier_${t.id}`)
  ) || TIERS[0];
  
  const effectiveMultiplier = (currentTier.id === 7.3 && isOverheated) ? 5.0 : currentTier.multiplier;
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
    // A. Heartbeat (Send "I am alive" to server)
    const beater = setInterval(async () => {
      if (status === 'MINING' && user) {
        // FIX: Create the timestamp INSIDE the interval so it is always fresh
        const now = new Date().toISOString();
        
        // Fire and forget - update the timestamp
        await supabase.from('users').update({ last_heartbeat: now }).eq('id', user.id);
      }
    }, 10000); // Ping every 10 seconds

    // B. Re-Sync (Get "True Balance" from server)
    const syncer = setInterval(async () => {
      if (user) {
        const { data } = await supabase.from('users').select('balance').eq('id', user.id).single();
        if (data) {
          // If our local visual balance is wildly different (>5% diff), snap to server balance
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
        const loadFactor = (Math.random() * 0.2) + 0.8; 
        
        let currentMult = currentTier.multiplier;
        if (currentTier.id === 7.3) {
           godModeRef.current += 0.1;
           setGodModeElapsed(Math.floor(godModeRef.current));
           if (godModeRef.current >= GOD_MODE_DAILY_LIMIT) {
             setIsOverheated(true);
             currentMult = 5.0; 
           }
        }

        const miningEarned = (BASE_MINING_RATE * currentMult * loadFactor * HALVING_MULTIPLIER) / 10;
        const referralEarned = (activeReferrals * REFERRAL_RATE_PER_TICK);
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

const handleBuyItem = async (item) => {
     if (balanceRef.current < item.price) return;

     // 1. Optimistic Update (Visual)
     const newBal = balanceRef.current - item.price;
     setBalance(newBal);
     balanceRef.current = newBal;
     
     const newInventory = [...inventory, item.id];
     setInventory(newInventory);

     // 2. Database Update
     // We update both balance and inventory array
     const { error } = await supabase
       .from('users')
       .update({ 
          balance: newBal,
          inventory: newInventory 
       })
       .eq('id', user.id);

     if (error) {
        // Rollback if failed (Optional, but good practice)
        console.error("Purchase failed", error);
     }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-mono overflow-hidden select-none relative">
      
      {/* HEADER WITH SIGNAL MAP INDICATOR */}
      <div className="p-4 border-b border-gray-900 bg-black/80 backdrop-blur-xl z-50">
        <div className="flex justify-between items-center">
          
          {/* LEFT: TIER INFO */}
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl">{currentTier.icon}</span>
              <h1 className="text-sm font-black tracking-[0.2em] uppercase" style={{ color: currentTier.color }}>
                {currentTier.name}
              </h1>
            </div>
            <div className="flex items-center space-x-2 mt-1">
               <span className="text-[9px] text-gray-500 tracking-widest uppercase">{currentTier.type} CLASS</span>
               
               {/* THE FOG OF WAR INDICATOR */}
               {status === 'MINING' && (
                 <div className="flex items-center space-x-1 px-2 py-0.5 bg-gray-900 rounded border border-gray-800 animate-pulse">
                    <Signal size={8} className={signalStrength === 'STRONG' ? 'text-green-500' : 'text-yellow-500'} />
                    <span className="text-[8px] text-gray-400">
                      {locationData ? `NET: ${cityNodeCount} NODES` : 'NET: SCANNING...'}
                    </span>
                 </div>
               )}
            </div>
          </div>

          {/* RIGHT: BALANCE */}
          <div className="text-right">
            <p className="text-[9px] text-gray-600 uppercase">Points (RP)</p>
            <p className="text-2xl font-bold tracking-tighter text-white">{balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
          </div>
        </div>
      </div>

      {/* CORE VIEW */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-0 z-10 w-full overflow-hidden">
        
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

              <MiningRig 
                 status={status} 
                 currentTier={currentTier} 
                 isOverheated={isOverheated} 
                 toggleMining={toggleMining} 
              />

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
    </div>
  )
}

export default App