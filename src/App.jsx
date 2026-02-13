import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Terminal, Activity, Users, Shield, Cpu, Wifi, Zap, Hexagon, Lock } from 'lucide-react'

// --- CONFIGURATION ---
const BASE_RATE = 0.8; // Max RIM per second (before hardware penalties)
const SAVE_INTERVAL = 5000;

const TIERS = [
  { name: 'BLIND BAT', threshold: 0, color: '#6B7280', multiplier: 1.0, icon: '🦇' },
  { name: 'ECHO SCOUT', threshold: 1000, color: '#9CA3AF', multiplier: 1.1, icon: '🦇' },
  { name: 'SONIC WING', threshold: 5000, color: '#22D3EE', multiplier: 1.25, icon: '🦇' },
  { name: 'PULSE DOLPHIN', threshold: 20000, color: '#3B82F6', multiplier: 1.5, icon: '🐬' },
  { name: 'ORCA FREQUENCY', threshold: 50000, color: '#8B5CF6', multiplier: 2.0, icon: '🐋' },
  { name: 'LEVIATHAN', threshold: 150000, color: '#EC4899', multiplier: 3.0, icon: '🐋' },
  { name: 'APEX RADAR', threshold: 500000, color: '#FCD34D', multiplier: 5.0, icon: '📡' },
];

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function App() {
  const [tab, setTab] = useState('TERMINAL');
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState('IDLE');
  
  // Hardware Simulation State
  const [npuLoad, setNpuLoad] = useState(0); // 0% to 100%
  const [latency, setLatency] = useState(0); // ms
  const [efficiency, setEfficiency] = useState(100); // %

  const [logs, setLogs] = useState([]);
  const balanceRef = useRef(0);
  const miningInterval = useRef(null);
  const hardwareInterval = useRef(null);
  const logInterval = useRef(null);

  const currentTierIndex = TIERS.slice().reverse().findIndex(t => balance >= t.threshold);
  const tierIndex = currentTierIndex === -1 ? 0 : TIERS.length - 1 - currentTierIndex;
  const tier = TIERS[tierIndex];
  const nextTier = TIERS[tierIndex + 1];

  // 1. INIT
  useEffect(() => {
    const init = async () => {
      let currentUser = null;
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#000000');
        if (tg.initDataUnsafe?.user) currentUser = tg.initDataUnsafe.user;
      }
      if (!currentUser) currentUser = { id: 999999999, first_name: 'Guest', username: 'browser_test' };
      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
        if (data) {
          setBalance(data.balance);
          balanceRef.current = data.balance;
        } else {
          await supabase.from('users').insert({ id: currentUser.id, first_name: currentUser.first_name, balance: 500 });
          setBalance(500);
          balanceRef.current = 500;
        }
      }
    };
    init();
  }, []);

  // 2. AUTO-SAVER
  useEffect(() => {
    const saver = setInterval(async () => {
      if (user && balanceRef.current > 0) {
        await supabase.from('users').update({ balance: balanceRef.current }).eq('id', user.id);
      }
    }, SAVE_INTERVAL);
    return () => clearInterval(saver);
  }, [user]);

  // 3. HARDWARE & MINING ENGINE
  const toggleMining = () => {
    if (status === 'MINING') {
      setStatus('IDLE');
      clearInterval(miningInterval.current);
      clearInterval(hardwareInterval.current);
      clearInterval(logInterval.current);
      setLogs([]);
      setNpuLoad(0);
      setLatency(0);
    } else {
      setStatus('MINING');
      
      // A. HARDWARE SIMULATION LOOP (Fluctuate stats)
      hardwareInterval.current = setInterval(() => {
        // Randomize NPU Load between 70% and 98%
        const newLoad = Math.floor(Math.random() * (98 - 70 + 1) + 70);
        // Randomize Latency between 20ms and 150ms
        const newLatency = Math.floor(Math.random() * (150 - 20 + 1) + 20);
        
        setNpuLoad(newLoad);
        setLatency(newLatency);

        // Calculate Efficiency: Drops if latency is high (>100ms)
        let eff = 100;
        if (newLatency > 100) eff -= (newLatency - 100);
        if (eff < 0) eff = 0;
        setEfficiency(eff);

      }, 2000);

      // B. EARNINGS LOOP (Depends on Hardware Stats)
      miningInterval.current = setInterval(() => {
        // Formula: Base * Tier * (NPU/100) * (Efficiency/100)
        // Note: We use state values directly here inside the closure or refs. 
        // For simplicity in React, we'll randomize slightly inside the tick to mimic the hook.
        
        const currentLoad = Math.random() * (0.98 - 0.70) + 0.70; // Mimic the NPU load
        const currentEff = 1.0; // Assume good internet for smoother ticker

        const earned = (BASE_RATE * tier.multiplier * currentLoad * currentEff) / 10;
        
        const newBal = parseFloat((balanceRef.current + earned).toFixed(3));
        setBalance(newBal);
        balanceRef.current = newBal;
      }, 100);

      // C. VALIDATOR LOGS
      logInterval.current = setInterval(() => {
        const actions = [
          `Validating Block 0x${Math.random().toString(16).substr(2, 6)}...`,
          `NPU Thread #4: COMPUTE_OK`,
          `Vectors Encrypted: ${Math.floor(Math.random() * 500)} shards`,
          `Upstream Sync: ${Math.floor(Math.random() * 50 + 10)}ms`,
          `Proof of Work: ACCEPTED`,
          `Allocating Rewards...`
        ];
        setLogs(prev => [actions[Math.floor(Math.random() * actions.length)], ...prev].slice(0, 8));
      }, 1500);
    }
  };

  const NavButton = ({ icon: Icon, label, activeTab }) => (
    <button onClick={() => setTab(activeTab)} className={`flex flex-col items-center justify-center w-full py-4 transition-all ${tab === activeTab ? 'text-cyan-400 bg-gray-900/50' : 'text-gray-600'}`}>
      <Icon size={22} strokeWidth={tab === activeTab ? 2.5 : 2} />
      <span className="text-[9px] font-bold tracking-widest mt-1 uppercase">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen bg-black text-white font-mono select-none overflow-hidden relative">
      <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] opacity-10 pointer-events-none">
        {[...Array(400)].map((_, i) => <div key={i} className="border-[0.5px] border-gray-800"></div>)}
      </div>

      {/* HEADER */}
      <div className="z-20 p-5 flex justify-between items-end bg-gradient-to-b from-black to-transparent">
        <div>
          <div className="flex items-center space-x-2 mb-1">
             <span className="text-2xl">{tier.icon}</span>
             <h1 className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">{tier.name}</h1>
          </div>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">{tier.multiplier}x REWARD BOOST</p>
        </div>
        <div className="text-right">
           <p className="text-[10px] text-gray-500 uppercase tracking-widest">RIM_BALANCE</p>
           <p className="text-2xl font-bold text-cyan-400 tracking-tighter shadow-cyan-500/50 drop-shadow-sm">{balance.toFixed(3)}</p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto pb-24 z-10 relative scrollbar-hide">
        
        {/* TERMINAL */}
        {tab === 'TERMINAL' && (
          <div className="flex flex-col items-center justify-center h-full pt-4">
             {/* HARDWARE STATS BAR */}
             <div className="w-full px-8 mb-8 grid grid-cols-2 gap-4">
                <div className="bg-gray-900/80 border border-gray-800 p-2 rounded flex flex-col items-center">
                   <div className="flex items-center space-x-2 text-[10px] text-gray-400 uppercase tracking-widest mb-1">
                     <Cpu size={12}/> <span>NPU Load</span>
                   </div>
                   <div className="text-lg font-bold text-cyan-400">{status === 'MINING' ? npuLoad : 0}%</div>
                </div>
                <div className="bg-gray-900/80 border border-gray-800 p-2 rounded flex flex-col items-center">
                   <div className="flex items-center space-x-2 text-[10px] text-gray-400 uppercase tracking-widest mb-1">
                     <Wifi size={12}/> <span>Latency</span>
                   </div>
                   <div className={`text-lg font-bold ${latency > 100 ? 'text-red-500' : 'text-green-500'}`}>{status === 'MINING' ? latency : 0}ms</div>
                </div>
             </div>

             {/* CORE */}
             <div onClick={toggleMining} className="relative w-64 h-64 flex items-center justify-center cursor-pointer group mb-10">
                {status === 'MINING' && <div className="absolute inset-0 border border-cyan-500/20 rounded-full animate-[ping_3s_linear_infinite]"></div>}
                {status === 'MINING' && <div className="absolute inset-12 border border-cyan-400/40 rounded-full animate-[pulse_2s_linear_infinite]"></div>}
                <div className={`transition-all duration-500 ${status === 'MINING' ? 'scale-110 drop-shadow-[0_0_40px_' + tier.color + ']' : 'scale-100 opacity-50 grayscale'}`}>
                  <svg width="140" height="140" viewBox="0 0 24 24" fill={status === 'MINING' ? tier.color : '#333'} xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fillOpacity="0.8"/>
                    <path d="M2 17L12 12L22 17L12 22L2 17Z" fillOpacity="0.5"/>
                    <path d="M2 7L2 17L12 12L12 2L2 7Z" fillOpacity="0.9"/>
                    <path d="M22 7L22 17L12 12L12 2L22 7Z" fillOpacity="0.9"/>
                  </svg>
                </div>
             </div>

             {/* STATUS */}
             <div className="flex items-center space-x-2 bg-gray-900/80 px-4 py-2 rounded-full border border-gray-800 backdrop-blur">
                <div className={`w-2 h-2 rounded-full ${status === 'MINING' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-[10px] tracking-widest text-gray-400 font-bold">
                  {status === 'MINING' ? `UPLINK ACTIVE • ${efficiency}% EFF` : 'DISCONNECTED'}
                </span>
             </div>
          </div>
        )}

        {/* VALIDATOR */}
        {tab === 'VALIDATOR' && (
          <div className="p-6 h-full flex flex-col">
            <h2 className="text-lg font-bold mb-4 flex items-center text-cyan-400"><Hexagon size={18} className="mr-2"/> LIVE VERIFICATION</h2>
            <div className="flex-1 bg-black border border-gray-800 rounded-lg p-4 font-mono text-[10px] text-green-500 overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
              <div className="absolute top-0 left-0 right-0 bg-gray-900/50 p-2 border-b border-gray-800 flex justify-between">
                <span>OUTPUT_STREAM</span>
                <span>pid: 8821</span>
              </div>
              <div className="mt-8 space-y-1">
                {status === 'IDLE' && <span className="text-gray-600">Waiting for compute stream...</span>}
                {logs.map((log, i) => <div key={i} className="opacity-80"><span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}</div>)}
              </div>
            </div>
          </div>
        )}

        {/* SQUAD */}
        {tab === 'SQUAD' && (
           <div className="p-6 pt-10 text-center">
             <div className="w-20 h-20 bg-gray-900 rounded-full mx-auto flex items-center justify-center border border-gray-700 mb-4"><Users size={32} className="text-gray-400"/></div>
             <h2 className="text-xl font-bold mb-2">THE HIVE</h2>
             <p className="text-xs text-gray-500 mb-8 max-w-xs mx-auto">Expand the neural net. Earn 10% of all data mined by your downstream nodes.</p>
             <button onClick={() => window.open(`https://t.me/share/url?url=https://t.me/RIM_Protocol_Bot/start?startapp=ref_${user?.id}&text=Join%20The%20Rim%20Protocol`, '_blank')} className="w-full py-4 bg-white text-black font-bold tracking-widest hover:bg-cyan-400 transition-colors">INITIATE RECRUITMENT</button>
           </div>
        )}

        {/* PROFILE */}
        {tab === 'PROFILE' && (
          <div className="p-6">
             <div className="flex items-center space-x-4 mb-8 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                <div className="w-12 h-12 bg-black rounded-full border border-gray-700 flex items-center justify-center text-xl">{tier.icon}</div>
                <div><h2 className="text-sm font-bold">{user?.first_name}</h2><p className="text-[10px] text-cyan-400">ID: {user?.id}</p></div>
             </div>
             <div className="mb-8">
               <div className="flex justify-between text-[10px] font-bold mb-2 text-gray-400"><span>CURRENT: {tier.name}</span><span>NEXT: {nextTier ? nextTier.name : 'MAX'}</span></div>
               <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800 relative"><div className="h-full bg-cyan-600" style={{ width: nextTier ? `${(balance / nextTier.threshold) * 100}%` : '100%' }}></div></div>
             </div>
             <div className="mt-8 flex items-center justify-center space-x-2 opacity-50"><Lock size={12} /><span className="text-[10px] uppercase tracking-widest">Wallet Disconnected</span></div>
          </div>
        )}

      </div>

      {/* DOCK */}
      <div className="fixed bottom-0 w-full bg-black border-t border-gray-900 flex justify-around items-center z-50 pb-2">
         <NavButton icon={Terminal} label="Terminal" activeTab="TERMINAL" />
         <NavButton icon={Hexagon} label="Validator" activeTab="VALIDATOR" />
         <NavButton icon={Users} label="Squad" activeTab="SQUAD" />
         <NavButton icon={Activity} label="Profile" activeTab="PROFILE" />
      </div>
    </div>
  )
}

export default App