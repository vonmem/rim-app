import { Wallet, Box, Clock, ArrowUpRight, Zap } from 'lucide-react';

const Inventory = ({ balance, currentTier, referralCount }) => {
  
  // Mock History Data (In real app, fetch from Supabase 'transactions' table)
  const history = [
    { id: 1, type: 'MINE', amount: '+45.20', time: '2 mins ago', icon: <Zap size={12}/> },
    { id: 2, type: 'REFERRAL', amount: '+12.50', time: '15 mins ago', icon: <Users size={12}/> },
    { id: 3, type: 'RELAY', amount: '-5.00', time: '1 hour ago', icon: <Clock size={12}/> }, // Consumable usage
    { id: 4, type: 'MINE', amount: '+120.00', time: 'Yesterday', icon: <Zap size={12}/> },
  ];

  // Mock Inventory Items
  const items = [
    { id: 1, name: 'Cloud Relay (1h)', count: 3, icon: '☁️', color: 'text-blue-400' },
    { id: 2, name: 'Signal Booster', count: 1, icon: '📡', color: 'text-green-400' },
    { id: 3, name: 'Empty Slot', count: 0, icon: '', color: 'text-gray-800' },
    { id: 4, name: 'Empty Slot', count: 0, icon: '', color: 'text-gray-800' },
  ];

  return (
    <div className="flex flex-col h-full w-full p-6 pt-20 overflow-y-auto bg-black text-white pb-24">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold flex items-center"><Wallet className="mr-2" /> ASSETS</h2>
      </div>

      {/* 1. BALANCE CARD (The "Black Card") */}
      <div className="w-full bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6 mb-8 relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet size={64} /></div>
         <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-1">Total Balance</p>
         <h1 className="text-3xl font-mono font-bold text-white mb-4">
            {balance.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-sm text-cyan-500">RIM</span>
         </h1>
         <div className="flex justify-between items-end">
            <div>
               <p className="text-[9px] text-gray-500 uppercase">Current Node Tier</p>
               <p className="text-xs font-bold" style={{ color: currentTier.color }}>{currentTier.name}</p>
            </div>
            <div className="text-right">
               <p className="text-[9px] text-gray-500 uppercase">Network Share</p>
               <p className="text-xs font-bold text-green-500">{(balance / 1000000).toFixed(6)}%</p>
            </div>
         </div>
      </div>

      {/* 2. INVENTORY GRID (RPG Style) */}
      <div className="mb-8">
         <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3 flex items-center">
            <Box size={10} className="mr-1"/> STORAGE
         </p>
         <div className="grid grid-cols-4 gap-2">
            {/* Active NFT Slot */}
            <div className="aspect-square bg-gray-900 border border-cyan-500/30 rounded flex flex-col items-center justify-center relative group">
               <div className="text-2xl">{currentTier.icon}</div>
               <span className="text-[8px] mt-1 text-gray-400">ACTIVE</span>
            </div>
            
            {/* Consumable Slots */}
            {items.map((item) => (
               <div key={item.id} className={`aspect-square bg-gray-900 border ${item.count > 0 ? 'border-gray-700' : 'border-gray-800 border-dashed'} rounded flex flex-col items-center justify-center relative`}>
                  {item.count > 0 ? (
                     <>
                        <div className="text-xl">{item.icon}</div>
                        <span className="absolute bottom-1 right-1 text-[8px] bg-gray-800 px-1 rounded text-white">x{item.count}</span>
                     </>
                  ) : (
                     <span className="text-gray-800">+</span>
                  )}
               </div>
            ))}
         </div>
      </div>

      {/* 3. TRANSACTION HISTORY */}
      <div>
         <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3 flex items-center">
            <Clock size={10} className="mr-1"/> LEDGER
         </p>
         <div className="space-y-2">
            {history.map((tx) => (
               <div key={tx.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded border border-gray-800/50">
                  <div className="flex items-center space-x-3">
                     <div className="p-2 bg-gray-800 rounded-full text-gray-400">{tx.icon}</div>
                     <div>
                        <p className="text-xs font-bold text-white">{tx.type}</p>
                        <p className="text-[9px] text-gray-500">{tx.time}</p>
                     </div>
                  </div>
                  <span className={`text-xs font-mono font-bold ${tx.amount.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                     {tx.amount}
                  </span>
               </div>
            ))}
         </div>
      </div>

    </div>
  );
};

// Need to import Users locally for the mock data icon
import { Users } from 'lucide-react';

export default Inventory;