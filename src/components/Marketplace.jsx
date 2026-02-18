import { useState } from 'react';
import { ShoppingBag, Zap, Shield, AlertTriangle } from 'lucide-react';

const Marketplace = ({ balance, userInventory, onBuyItem }) => {
  const [loadingId, setLoadingId] = useState(null);

  // Define the Items
  const ITEMS = [
    // --- CONSUMABLES ---
    { 
      id: 'cloud_relay_1h', 
      name: 'CLOUD RELAY (24h)', 
      type: 'CONSUMABLE', 
      price: 500, 
      icon: '☁️', 
      desc: 'Keeps mining active while app is closed.' 
    },
    { 
      id: 'signal_booster', 
      name: 'SIGNAL BOOSTER', 
      type: 'CONSUMABLE', 
      price: 2000, 
      icon: '📡', 
      desc: '+10% Yield for 1 hour.' 
    },
    // --- NFT RIGS (TIERS) ---
    { id: 'tier_2', name: 'HIGH-FLYER NFT', type: 'RIG', price: 1000, icon: '🦇', multiplier: '1.2x' },
    { id: 'tier_3', name: 'VAMPIRE NFT', type: 'RIG', price: 5000, icon: '🧛', multiplier: '1.5x' },
    { id: 'tier_4', name: 'DIVER DOLPHIN', type: 'RIG', price: 20000, icon: '🐬', multiplier: '2.0x' },
    { id: 'tier_5', name: 'SURFER DOLPHIN', type: 'RIG', price: 100000, icon: '🐋', multiplier: '3.0x' },
    { id: 'tier_6', name: 'SUPER-ALLIANCE', type: 'RIG', price: 500000, icon: '🔱', multiplier: '5.0x' },
    { id: 'tier_7.1', name: 'APEX MK1', type: 'RIG', price: 1500000, icon: '👁️', multiplier: '10x' },
  ];

  const handlePurchase = async (item) => {
    if (balance < item.price) return; // Logic handled in App.jsx too, but safe check here
    
    setLoadingId(item.id);
    await onBuyItem(item); // Call the parent function
    setLoadingId(null);
  };

  return (
    <div className="flex flex-col h-full w-full p-6 pt-20 overflow-y-auto bg-black text-white pb-24">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold flex items-center"><ShoppingBag className="mr-2" /> BLACK MARKET</h2>
         <div className="text-right">
            <p className="text-[9px] text-gray-500 uppercase">Available Funds</p>
            <p className="text-sm font-mono text-cyan-400">{balance.toFixed(2)} RIM</p>
         </div>
      </div>

      {/* CONSUMABLES SECTION */}
      <div className="mb-8">
        <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3 flex items-center">
            <Zap size={10} className="mr-1"/> OPERATIONAL UPGRADES
        </p>
        <div className="space-y-3">
          {ITEMS.filter(i => i.type === 'CONSUMABLE').map(item => (
            <div key={item.id} className="bg-gray-900 border border-gray-800 p-4 rounded-lg flex justify-between items-center">
               <div className="flex items-center space-x-3">
                  <div className="text-2xl">{item.icon}</div>
                  <div>
                     <p className="text-xs font-bold text-white">{item.name}</p>
                     <p className="text-[9px] text-gray-500">{item.desc}</p>
                  </div>
               </div>
               <button 
                  onClick={() => handlePurchase(item)}
                  disabled={balance < item.price || loadingId === item.id}
                  className={`px-4 py-2 text-[10px] font-bold rounded transition-colors ${
                    balance >= item.price 
                    ? 'bg-white text-black hover:bg-cyan-400' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
               >
                  {loadingId === item.id ? 'PROCESSING...' : `BUY ${item.price}`}
               </button>
            </div>
          ))}
        </div>
      </div>

      {/* RIGS SECTION */}
      <div>
        <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3 flex items-center">
            <Shield size={10} className="mr-1"/> NEURAL RIGS (PERMANENT)
        </p>
        <div className="space-y-3">
          {ITEMS.filter(i => i.type === 'RIG').map(item => {
             const isOwned = userInventory.includes(item.id);
             return (
              <div key={item.id} className={`border p-4 rounded-lg flex justify-between items-center ${isOwned ? 'bg-cyan-900/20 border-cyan-500/50' : 'bg-gray-900 border-gray-800'}`}>
                 <div className="flex items-center space-x-3">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                       <p className="text-xs font-bold text-white">{item.name}</p>
                       <p className="text-[9px] text-cyan-400 font-bold">{item.multiplier} POWER</p>
                    </div>
                 </div>
                 
                 {isOwned ? (
                    <span className="text-[10px] font-bold text-cyan-400 flex items-center">
                       <Shield size={10} className="mr-1"/> OWNED
                    </span>
                 ) : (
                    <button 
                       onClick={() => handlePurchase(item)}
                       disabled={balance < item.price || loadingId === item.id}
                       className={`px-4 py-2 text-[10px] font-bold rounded transition-colors ${
                         balance >= item.price 
                         ? 'bg-white text-black hover:bg-cyan-400' 
                         : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                       }`}
                    >
                       {loadingId === item.id ? 'MINTING...' : `MINT ${item.price}`}
                    </button>
                 )}
              </div>
             );
          })}
        </div>
      </div>

    </div>
  );
};

export default Marketplace;