import React from 'react';

// 🚨 UPDATED: Catching all 6 props from App.jsx!
const Marketplace = ({ TIERS, CONSUMABLES, balance, userInventory, onBuyItem, buyBlackMarketItem }) => {
  return (
    <div className="w-full h-full overflow-y-auto pb-24 px-4 pt-4 text-white">
      
      {/* HEADER */}
      <div className="mb-6 border-b border-gray-800 pb-2">
        <h2 className="text-xl font-black tracking-widest text-cyan-400">THE BLACK MARKET</h2>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Unregulated Hardware & Contraband</p>
      </div>

      {/* SECTION 1: CONTRABAND (Consumables) */}
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
                onClick={() => buyBlackMarketItem(item)}
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

      {/* SECTION 2: HARDWARE (The old "Mint" Rigs) */}
      <div>
        <h3 className="text-sm font-bold tracking-widest text-cyan-400 mb-3 flex items-center">
          <span className="mr-2">⚡</span> HARDWARE UPGRADES
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {/* We slice(1) to hide the free Scout tier from the shop */}
          {TIERS.slice(1).map(tier => {
             // Check if the user already owns this specific rig
             const isOwned = userInventory && userInventory.includes(`tier_${tier.id}`);
             const isAffordable = typeof tier.threshold === 'number' && balance >= tier.threshold;

             return (
               <div key={tier.id} className="bg-gray-900/50 border border-gray-800 p-3 rounded-lg flex flex-col items-center text-center">
                  <img src={tier.image} alt={tier.name} className="w-16 h-16 object-contain mb-2 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]" />
                  <h4 className="font-bold text-[10px] tracking-widest" style={{ color: tier.color }}>{tier.name}</h4>
                  <p className="text-[8px] text-gray-500 mb-2">{tier.multiplier}x MULTIPLIER</p>
                  
                  <button 
                     // Trigger your old Rig buying function!
                     onClick={() => !isOwned && onBuyItem(tier)}
                     disabled={isOwned || (!isOwned && !isAffordable)}
                     className={`w-full py-1.5 text-[9px] font-bold rounded tracking-widest transition-colors ${
                        isOwned ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed' :
                        isAffordable ? 'bg-cyan-900/30 border border-cyan-500 text-cyan-400 hover:bg-cyan-800/50' :
                        'bg-red-900/20 border border-red-900 text-red-700 cursor-not-allowed'
                     }`}
                  >
                     {isOwned ? 'INTEGRATED' : 
                      typeof tier.threshold === 'number' ? `${tier.threshold.toLocaleString()} RP` : 
                      tier.threshold}
                  </button>
               </div>
             );
          })}
        </div>
      </div>

    </div>
  );
};

export default Marketplace;