import React, { useState } from 'react';
import { Shield, ShoppingBag, X, Check } from 'lucide-react';

const Marketplace = ({ TIERS, CONSUMABLES, balance, userInventory, onBuyItem, buyBlackMarketItem }) => {
  // Modal State for BOTH Rigs and Consumables
  const [confirmItem, setConfirmItem] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const executePurchase = async () => {
    if (!confirmItem) return;
    setLoadingId(confirmItem.id);
    
    // 🚨 SMART ROUTING: Check if it's a Rig or a Consumable!
    if (confirmItem.type === 'RIG' || confirmItem.type === 'GOD') {
        await onBuyItem(confirmItem);
    } else {
        await buyBlackMarketItem(confirmItem);
    }
    
    setLoadingId(null);
    setConfirmItem(null);
  };

  return (
    <div className="w-full h-full overflow-y-auto pb-24 px-4 pt-4 text-white relative">
      
      {/* HEADER */}
      <div className="mb-6 border-b border-gray-800 pb-2">
        <h2 className="text-xl font-black tracking-widest text-cyan-400">THE BLACK MARKET</h2>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Unregulated Hardware & Contraband</p>
      </div>

      {/* SECTION 1: CONTRABAND (Consumables & Boosters) */}
      <div className="mb-8">
        <h3 className="text-sm font-bold tracking-widest text-red-400 mb-3 flex items-center">
          <span className="mr-2">⚠️</span> CONTRABAND & EXPLOITS
        </h3>
        <div className="space-y-3">
          {CONSUMABLES.map(item => (
            <div key={item.id} className="bg-gray-900/50 border border-gray-800 p-3 rounded-lg flex items-center justify-between">
              
              <div className="flex items-center space-x-3">
                <div className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{item.icon}</div>
                <div>
                  <h4 className="font-bold text-[11px] tracking-widest" style={{ color: item.color }}>{item.name}</h4>
                  <p className="text-[8px] text-gray-500 leading-tight mt-1 max-w-[150px]">{item.desc}</p>
                </div>
              </div>
              
              <button 
                // 🚨 CHANGED: Now opens the Modal instead of buying instantly!
                onClick={() => setConfirmItem(item)}
                disabled={item.type !== 'PREMIUM' && balance < item.costRP}
                className={`px-3 py-2 rounded text-[9px] font-black tracking-widest border transition-all ${
                  item.type === 'PREMIUM' 
                    ? 'bg-purple-900/30 border-purple-500 text-purple-400 hover:bg-purple-800/50' 
                    : balance >= item.costRP 
                      ? 'bg-green-900/30 border-green-500 text-green-400 hover:bg-green-800/50'
                      : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                }`}
              >
                {item.type === 'PREMIUM' ? item.costCrypto : `${item.costRP.toLocaleString()} RP`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: HARDWARE (The Trading Card Gallery) */}
      <div>
        <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3 flex items-center">
            <Shield size={10} className="mr-1"/> NEURAL RIGS (PERMANENT)
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          {TIERS.slice(1).map((tier) => {
             const isOwned = userInventory && userInventory.includes(`tier_${tier.id}`);
             const canAfford = typeof tier.threshold === 'number' && balance >= tier.threshold;
             const rawPrice = typeof tier.threshold === 'number' ? tier.threshold : parseInt(tier.threshold.toString().replace(/[^0-9]/g, ''));
             
             return (
               <div 
                 key={tier.id} 
                 onClick={() => {
                    if (isOwned) return;
                    setConfirmItem(tier); // Opens the Modal
                 }}
                 className={`relative rounded-xl flex flex-col overflow-hidden transition-all duration-300 ${
                   isOwned ? 'cursor-default' : 'cursor-pointer hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] hover:-translate-y-1'
                 } ${!isOwned && !canAfford ? 'opacity-75 grayscale' : ''}`}
               >
                 <div className={`h-56 w-full relative ${isOwned ? 'bg-gray-900' : 'bg-black'}`}>
                   <div className={`absolute inset-0 blur-2xl opacity-40 ${isOwned ? 'bg-green-900' : canAfford ? 'bg-cyan-900' : 'bg-gray-900'}`}></div>
                   <img src={tier.image} alt={tier.name} className="w-full h-full object-cover z-10 relative drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                 </div>

                 <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/90 to-transparent pt-8 z-20">
                   <h3 className="text-[10px] font-black tracking-widest uppercase mb-1 truncate" style={{ color: tier.color }}>{tier.name}</h3>
                   <div className="flex justify-between items-center">
                     <span className="text-[9px] text-cyan-400 font-bold border border-cyan-900 bg-cyan-950/80 px-1.5 py-0.5 rounded backdrop-blur-md">
                       {tier.multiplier}x
                     </span>
                     <span className="text-[9px] text-yellow-500 font-mono tracking-tighter font-bold">
                       {rawPrice.toLocaleString()} RP
                     </span>
                   </div>
                 </div>

                 {isOwned && (
                   <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-30">
                     <span className="text-[10px] text-green-400 font-black tracking-[0.2em] border border-green-500 px-3 py-1 rounded bg-green-900/40 transform -rotate-12 shadow-xl">
                       INTEGRATED
                     </span>
                   </div>
                 )}
                 <div className={`absolute inset-0 border-2 rounded-xl z-40 pointer-events-none ${isOwned ? 'border-green-500/50' : canAfford ? 'border-cyan-500/50' : 'border-gray-800'}`}></div>
               </div>
             );
          })}
        </div>
      </div>

      {/* --- UNIVERSAL CONFIRMATION MODAL --- */}
      {confirmItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
           <div className="bg-gray-900 border border-cyan-500 rounded-lg p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50 animate-pulse"></div>

              <h3 className="text-lg font-bold text-white mb-4 flex items-center uppercase tracking-widest">
                 <ShoppingBag size={18} className="mr-2 text-cyan-400"/> CONFIRM ACQUISITION
              </h3>

              <div className="bg-black/50 p-4 rounded mb-6 border border-gray-800 text-center">
                 <div className="text-4xl mb-3">{confirmItem.icon}</div>
                 <p className="text-sm font-black tracking-widest mb-2" style={{ color: confirmItem.color }}>{confirmItem.name}</p>
                 
                 <div className="inline-block bg-gray-900 border border-gray-700 rounded px-4 py-2 mb-3">
                    <p className="text-[8px] text-gray-500 uppercase tracking-widest">Total Cost</p>
                    <p className="text-lg font-mono text-cyan-400 font-bold">
                      {/* 🚨 DYNAMIC PRICE LOGIC: Checks Premium vs RP vs Hardware Thresholds */}
                      {confirmItem.type === 'PREMIUM' ? confirmItem.costCrypto : 
                       confirmItem.costRP ? `${confirmItem.costRP.toLocaleString()} RP` : 
                       typeof confirmItem.threshold === 'number' ? `${confirmItem.threshold.toLocaleString()} RP` : 
                       confirmItem.threshold}
                    </p>
                 </div>
                 
                 <p className="text-[10px] text-gray-400">
                    {/* 🚨 DYNAMIC DESC: Shows item desc OR rig stats */}
                    {confirmItem.desc || `Permanently unlocks ${confirmItem.multiplier}x base mining power.`}
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => setConfirmItem(null)}
                    className="py-3 rounded bg-gray-800 text-gray-400 font-bold text-[10px] hover:bg-gray-700 flex items-center justify-center tracking-widest"
                 >
                    <X size={14} className="mr-1"/> CANCEL
                 </button>
                 <button 
                    onClick={executePurchase}
                    disabled={loadingId === confirmItem.id}
                    className="py-3 rounded bg-white text-black font-bold text-[10px] hover:bg-cyan-400 hover:text-black flex items-center justify-center tracking-widest transition-colors"
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