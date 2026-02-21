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
    { id: 'tier_2', name: 'HIGH-FLYER NFT', type: 'RIG', price: 1000, icon: '🦇', image: '/pro_bat.png', multiplier: '1.2x' },
    { id: 'tier_3', name: 'VAMPIRE NFT', type: 'RIG', price: 5000, icon: '🧛', image: '/vampire.png', multiplier: '1.5x' },
    { id: 'tier_4', name: 'DIVER DOLPHIN', type: 'RIG', price: 20000, icon: '🐬', image: '/diver.png', multiplier: '2.0x' },
    { id: 'tier_5', name: 'SURFER DOLPHIN', type: 'RIG', price: 100000, icon: '🐋', image: '/surfer.png', multiplier: '3.0x' },
    { id: 'tier_6', name: 'SUPER-ALLIANCE', type: 'RIG', price: 500000, icon: '🔱', image: '/alliance.png', multiplier: '5.0x' },
    { id: 'tier_7.1', name: 'APEX MK1', type: 'RIG', price: 1500000, icon: '👁️', image: '/apex1.png', multiplier: '10x' },
    { id: 'tier_7.2', name: 'APEX MK2', type: 'RIG', price: 5000000, icon: '🌀', image: '/apex2.png', multiplier: '25x' },
    { id: 'tier_7.3', name: 'GOD EYE', type: 'RIG', price: 20000000, icon: '☀️', image: '/apex3.png', multiplier: '100x' }
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

      {/* RIGS SECTION (TRADING CARD GALLERY) */}
      <div>
        <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3 flex items-center">
            <Shield size={10} className="mr-1"/> NEURAL RIGS (PERMANENT)
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {ITEMS.filter(i => i.type === 'RIG').map((item) => {
             const isOwned = userInventory && userInventory.includes(item.id);
             const canAfford = balance >= item.price;
             
             return (
               <div 
                 key={item.id} 
                 onClick={() => !isOwned && onBuyItem(item)}
                 // CHANGED: Removed 'border' class here, we'll handle borders on the image/overlay
                 className={`relative rounded-xl flex flex-col overflow-hidden transition-all duration-300 ${
                   isOwned ? 'cursor-default' :
                   canAfford ? 'cursor-pointer hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:-translate-y-1' : 
                   'cursor-not-allowed opacity-75'
                 }`}
               >
                 {/* Image Section - TALLER PORTRAIT */}
                 {/* CHANGED: Height increased to h-48 or h-56 for portrait look. Removed padding (p-2). */}
                 <div className={`h-56 w-full relative ${isOwned ? 'bg-gray-900' : 'bg-black'}`}>
                   {/* Background Glow */}
                   <div className={`absolute inset-0 blur-2xl opacity-40 ${isOwned ? 'bg-green-900' : canAfford ? 'bg-cyan-900' : 'bg-gray-900'}`}></div>
                   
                   {/* IMAGE - FILLS FRAME */}
                   {/* CHANGED: object-contain -> object-cover. Added w-full h-full. */}
                   <img src={item.image} alt={item.name} className="w-full h-full object-cover z-10 relative" />
                 </div>

                 {/* Text Overlay Section - FULL WIDTH BOTTOM OVERLAY */}
                 {/* CHANGED: Added absolute positioning to sit over the bottom of the image */}
                 <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent pt-6 z-20">
                   <h3 className="text-[10px] font-black text-white tracking-widest uppercase mb-1 truncate">{item.name}</h3>
                   <div className="flex justify-between items-center">
                     <span className="text-[9px] text-cyan-400 font-bold border border-cyan-900 bg-cyan-950/80 px-1.5 py-0.5 rounded backdrop-blur-md">
                       {item.multiplier}
                     </span>
                     <span className="text-[9px] text-yellow-500 font-mono tracking-tighter font-bold">
                       {item.price.toLocaleString()} RP
                     </span>
                   </div>
                 </div>

                 {/* Owned / Lock Overlay */}
                 {isOwned && (
                   <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-30">
                     <span className="text-[10px] text-green-400 font-black tracking-[0.2em] border border-green-500 px-3 py-1 rounded bg-green-900/40 transform -rotate-12 shadow-xl">
                       OWNED
                     </span>
                   </div>
                 )}
                 
                  {/* BORDER OVERLAY - For clean edges */}
                  <div className={`absolute inset-0 border-2 rounded-xl z-40 pointer-events-none ${isOwned ? 'border-green-500/50' : canAfford ? 'border-cyan-500/50' : 'border-gray-800'}`}></div>
               </div>
             );
          })}
        </div>
      </div>

      {/* --- CONFIRMATION MODAL --- */}
      {confirmItem && (
        // FIX: Changed "absolute" to "fixed" and "z-50" to "z-[100]"
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
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