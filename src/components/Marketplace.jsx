import { useState } from 'react';
import { ShoppingBag, Zap, Shield, X, Check } from 'lucide-react';

const Marketplace = ({ balance, userInventory, onBuyItem }) => {
  const [loadingId, setLoadingId] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null); // Stores the item waiting for confirmation

  // Define the Items
  const ITEMS = [
    // --- CONSUMABLES ---
    { id: 'cloud_relay_24h', name: 'CLOUD RELAY (24H)', type: 'CONSUMABLE', price: 500, icon: '☁️', desc: 'Maintains 100% mining rate while app is closed for 24 hours.' },
    { id: 'cloud_relay_3d', name: 'CLOUD RELAY (3 DAYS)', type: 'CONSUMABLE', price: 1350, icon: '🌥️', desc: 'Maintains 100% mining rate while app is closed for 72 hours.' },
    { id: 'cloud_relay_7d', name: 'HEAVY RELAY (7 DAYS)', type: 'CONSUMABLE', price: 2800, icon: '🌩️', desc: 'Set it and forget it. 168 hours of uninterrupted offline mining.' },
    { id: 'signal_booster_1h', name: 'SIGNAL BOOSTER (1H)', type: 'CONSUMABLE', price: 200, icon: '📡', desc: '+20% mining speed for 1 hour. Requires active uplink.' },
    { id: 'botnet_injection', name: 'BOTNET INJECTION', type: 'CONSUMABLE', price: 1000, icon: '🦠', desc: 'Doubles the RP yield from your active referrals for 24 hours.' },
    
    // --- NFT RIGS (TIERS) ---
    { id: 'tier_2', name: 'HIGH-FLYER NFT', type: 'RIG', price: 1000, icon: '🦇', multiplier: '1.2x' },
    { id: 'tier_3', name: 'VAMPIRE NFT', type: 'RIG', price: 5000, icon: '🧛', multiplier: '1.5x' },
    { id: 'tier_4', name: 'DIVER DOLPHIN', type: 'RIG', price: 20000, icon: '🐬', multiplier: '2.0x' },
    { id: 'tier_5', name: 'SURFER DOLPHIN', type: 'RIG', price: 100000, icon: '🐋', multiplier: '3.0x' },
    { id: 'tier_6', name: 'SUPER-ALLIANCE', type: 'RIG', price: 500000, icon: '🔱', multiplier: '5.0x' },
    { id: 'tier_7.1', name: 'APEX MK1', type: 'RIG', price: 1500000, icon: '👁️', multiplier: '10x' },
  ];

  // 1. User Clicks "Buy" -> Open Modal
  const initiatePurchase = (item) => {
    if (balance < item.price) return;
    setConfirmItem(item);
  };

  // 2. User Clicks "Confirm" -> Execute Transaction
  const executePurchase = async () => {
    if (!confirmItem) return;

    setLoadingId(confirmItem.id);
    await onBuyItem(confirmItem); // Call parent
    setLoadingId(null);
    setConfirmItem(null); // Close modal
  };

  return (
    <div className="flex flex-col h-full w-full p-6 pt-20 overflow-y-auto bg-black text-white pb-24 relative">
      
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
                  onClick={() => initiatePurchase(item)}
                  disabled={balance < item.price}
                  className={`px-4 py-2 text-[10px] font-bold rounded transition-colors ${
                    balance >= item.price 
                    ? 'bg-white text-black hover:bg-cyan-400' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
               >
                  BUY {item.price}
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
                       onClick={() => initiatePurchase(item)}
                       disabled={balance < item.price}
                       className={`px-4 py-2 text-[10px] font-bold rounded transition-colors ${
                         balance >= item.price 
                         ? 'bg-white text-black hover:bg-cyan-400' 
                         : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                       }`}
                    >
                       MINT {item.price}
                    </button>
                 )}
              </div>
             );
          })}
        </div>
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      {confirmItem && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
           <div className="bg-gray-900 border border-cyan-500 rounded-lg p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
              
              {/* Scanline Effect */}
              <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50 animate-pulse"></div>

              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                 <ShoppingBag size={18} className="mr-2 text-cyan-400"/> CONFIRM ACQUISITION
              </h3>

              <div className="bg-black/50 p-4 rounded mb-6 border border-gray-800">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-3xl">{confirmItem.icon}</span>
                    <div className="text-right">
                       <p className="text-[10px] text-gray-500 uppercase">Item Cost</p>
                       <p className="text-xl font-mono text-cyan-400 font-bold">{confirmItem.price} RP</p>
                    </div>
                 </div>
                 <p className="text-sm font-bold text-white">{confirmItem.name}</p>
                 <p className="text-xs text-gray-400 mt-1">{confirmItem.type === 'RIG' ? `Permanently unlocks ${confirmItem.multiplier} mining power.` : confirmItem.desc}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => setConfirmItem(null)}
                    className="py-3 rounded bg-gray-800 text-gray-400 font-bold text-xs hover:bg-gray-700 flex items-center justify-center"
                 >
                    <X size={14} className="mr-1"/> CANCEL
                 </button>
                 <button 
                    onClick={executePurchase}
                    disabled={loadingId === confirmItem.id}
                    className="py-3 rounded bg-white text-black font-bold text-xs hover:bg-cyan-400 flex items-center justify-center"
                 >
                    {loadingId === confirmItem.id ? (
                       <span className="animate-pulse">PROCESSING...</span>
                    ) : (
                       <><Check size={14} className="mr-1"/> CONFIRM</>
                    )}
                 </button>
              </div>

           </div>
        </div>
      )}

    </div>
  );
};

export default Marketplace;