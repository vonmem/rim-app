import React, { useState } from 'react';
import { Wallet, Box, Clock, Zap, Users, X, Check, Activity, ShoppingBag, Shield, ShieldCheck, Cpu, Lock, Unlock} from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth'; // 🚨 IMPORT PRIVY HOOK
// 🚨 WEB3 & PRIVY IMPORTS
import { useWallets } from '@privy-io/react-auth';
import { useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Format ISO timestamp as relative time (e.g. "2 mins ago")
function formatTimeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return 'Just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)} mins ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours ago`;
  if (ms < 604800000) return `${Math.floor(ms / 86400000)} days ago`;
  return new Date(iso).toLocaleDateString();
}

// --- MAINNET ACTIVATION SUB-COMPONENT ---
const MainnetActivationCard = ({ hasLicense, onSuccess }) => {
   const [isProcessing, setIsProcessing] = useState(false);
   const { wallets } = useWallets();
   const { signAndSendTransaction } = useSignAndSendTransaction();
 
   const handlePurchaseLicense = async () => {
     setIsProcessing(true);
     try {
       const solanaWallet = wallets.find((w) => w.chainType === 'solana');
       if (!solanaWallet) {
         alert("Please connect your Secure Network in the Wallet tab first!");
         setIsProcessing(false);
         return;
       }
 
       // Connect to Solana Devnet for testing (change to 'mainnet-beta' for launch)
       const connection = new Connection('https://api.devnet.solana.com');
       
       // 🚨 REPLACE WITH YOUR ACTUAL PHANTOM WALLET ADDRESS 🚨
       const TREASURY_ADDRESS = new PublicKey("2y5gDC79ffAfHJiiBczyKQRoR2DP1VfNWoDgfTQ7Nnqo");
       const fromPubkey = new PublicKey(solanaWallet.address);
 
       // Build the 0.03 SOL transfer
       const transaction = new Transaction().add(
         SystemProgram.transfer({
           fromPubkey: fromPubkey,
           toPubkey: TREASURY_ADDRESS,
           lamports: 0.03 * LAMPORTS_PER_SOL,
         })
       );
 
       const { blockhash } = await connection.getLatestBlockhash();
       transaction.recentBlockhash = blockhash;
       transaction.feePayer = fromPubkey;
 
       // Trigger Privy Modal to sign
       const { signature } = await signAndSendTransaction({ 
         transaction, 
         wallet: solanaWallet 
       });
 
       console.log("Payment successful! Tx Hash:", signature);
       alert("Mainnet Node Activated! Welcome to the Syndicate.");
       
       // Tell the parent component to update Supabase!
       if (onSuccess) onSuccess();
 
     } catch (error) {
       console.error("Payment failed or cancelled:", error);
     } finally {
       setIsProcessing(false);
     }
   };
 
   if (hasLicense) {
     return (
       <div className="bg-gray-900 border border-green-500/50 rounded-xl p-5 mb-8 shadow-[0_0_20px_rgba(34,197,94,0.15)] relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={80} /></div>
         <div className="flex items-center text-green-400 mb-2">
           <ShieldCheck size={20} className="mr-2" />
           <h3 className="font-bold tracking-widest uppercase">Mainnet Node Active</h3>
         </div>
         <p className="text-xs text-gray-400 mt-2 tracking-wide">
           Your rig is fully authenticated. Withdrawals are unlocked and your 10% mining boost is active.
         </p>
       </div>
     );
   }
 
   return (
     <div className="bg-gradient-to-br from-gray-900 to-black border border-yellow-500/40 rounded-xl p-5 mb-8 shadow-[0_0_25px_rgba(234,179,8,0.15)] relative overflow-hidden group">
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 animate-pulse"></div>
       
       <div className="flex justify-between items-start mb-4">
         <div>
           <h3 className="text-lg font-black text-white tracking-widest uppercase flex items-center drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
             <Cpu className="mr-2 text-yellow-400" size={20} />
             Lvl 1 Uplink License
           </h3>
           <p className="text-[10px] text-gray-400 tracking-widest uppercase mt-1">Sybil-Resistance Protocol</p>
         </div>
         <div className="text-right">
           <p className="text-xs text-gray-500 uppercase tracking-widest">Cost</p>
           <p className="text-lg font-mono font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]">0.03 SOL</p>
           <p className="text-[9px] text-gray-500">~$4.99 USD</p>
         </div>
       </div>
 
       <div className="bg-black/50 rounded-lg p-3 border border-gray-800 mb-5 space-y-2">
         <div className="flex items-center text-xs">
           <Unlock size={14} className="text-cyan-400 mr-2" />
           <span className="text-gray-300"><strong className="text-white">Unlocks</strong> full RP-to-$RIM withdrawals</span>
         </div>
         <div className="flex items-center text-xs">
           <Activity size={14} className="text-green-400 mr-2" />
           <span className="text-gray-300">Instantly receive a <strong className="text-green-400">$5.00 $RIM Rebate</strong> (Locked)</span>
         </div>
         <div className="flex items-center text-xs">
           <Zap size={14} className="text-yellow-400 mr-2" />
           <span className="text-gray-300">Permanent <strong className="text-yellow-400">+10%</strong> Global Mining Boost</span>
         </div>
       </div>
 
       <button 
         onClick={handlePurchaseLicense}
         disabled={isProcessing}
         className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-black text-xs tracking-widest uppercase rounded flex items-center justify-center transition-all shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:shadow-[0_0_25px_rgba(234,179,8,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
       >
         {isProcessing ? (
           <span className="animate-pulse flex items-center"><Activity size={16} className="mr-2 animate-spin"/> AWAITING SIGNATURE...</span>
         ) : (
           <><Lock size={16} className="mr-2"/> INITIATE MAINNET BRIDGE</>
         )}
       </button>
     </div>
   );
 };

 const Inventory = ({ balance, currentTier, referralCount, consumables, CONSUMABLES, deployConsumable, transactions = [], hasMainnetLicense, onActivateMainnet }) => {
  // Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);

  // 🚨 PRIVY STATE EXTRACTOR
  const { login, authenticated, user } = usePrivy();
  // Look for an external Phantom wallet first.
  // If none, hunt through their linked accounts for the Privy SOLANA embedded wallet!
  const walletAddress = 
    user?.wallet?.address || 
    user?.linkedAccounts?.find(a => a.type === 'wallet' && a.walletClientType === 'privy' && a.chainType === 'solana')?.address ||
    user?.linkedAccounts?.find(a => a.type === 'wallet' && a.walletClientType === 'privy')?.address;

  const ownedItems = [];
  if (consumables && CONSUMABLES) {
     Object.entries(consumables).forEach(([id, qty]) => {
        if (qty > 0) {
           const meta = CONSUMABLES.find(c => c.id === id || c.id === id.replace('_bulk', ''));
           if (meta) ownedItems.push({ ...meta, qty, baseId: id });
        }
     });
  }

  const totalSlotsToDisplay = Math.max(7, ownedItems.length + (4 - (ownedItems.length + 1) % 4)); 
  const emptySlotCount = Math.max(0, totalSlotsToDisplay - ownedItems.length);
  const emptySlots = Array(emptySlotCount).fill(null);

  const handleDeploy = async () => {
     if (!selectedItem) return;
     setIsDeploying(true);
     await deployConsumable(selectedItem);
     setIsDeploying(false);
     setSelectedItem(null);
  };

  return (
    <div className="flex flex-col h-full w-full p-6 pt-20 overflow-y-auto bg-black text-white pb-24 relative">
      
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold flex items-center"><Wallet className="mr-2" /> ASSETS</h2>
      </div>

      {/* 🚨 THE NEW PRIVY WEB3 BRIDGE CARD */}
      <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-4 mb-6 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${authenticated ? 'bg-green-500 animate-pulse' : 'bg-purple-500 animate-pulse'}`}></span>
              {authenticated ? 'Secure Network' : 'Solana Network'}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
              {authenticated ? 'Embedded Wallet Active' : 'Bridge Required for NFT Tiers'}
            </p>
          </div>
          
          {authenticated && walletAddress ? (
            <div className="bg-purple-900/40 border border-purple-500/50 px-3 py-1.5 rounded text-purple-300 font-mono text-[10px] shadow-[0_0_10px_rgba(168,85,247,0.2)]">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </div>
          ) : (
            <button 
              onClick={login}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] tracking-widest uppercase rounded transition-colors shadow-[0_0_15px_rgba(147,51,234,0.4)]"
            >
              CONNECT WALLET
            </button>
          )}
        </div>
      </div>

      {/* --- EXISTING RP BALANCE CARD --- */}
      <div className="w-full bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-6 mb-8 relative overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
         <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50 animate-pulse"></div>
         <div className="absolute -top-4 -right-4 p-4 opacity-10"><Wallet size={100} /></div>
         <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-1">Total Balance</p>
         <h1 className="text-3xl font-mono font-bold text-white mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {balance.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-sm text-cyan-500">RP</span>
         </h1>
         <div className="flex justify-between items-end relative z-10">
            <div>
               <p className="text-[9px] text-gray-500 uppercase tracking-widest">Current Node Tier</p>
               <p className="text-xs font-black tracking-widest uppercase mt-0.5" style={{ color: currentTier.color }}>{currentTier.name}</p>
            </div>
            <div className="text-right">
               <p className="text-[9px] text-gray-500 uppercase tracking-widest">Network Share</p>
               <p className="text-xs font-bold text-green-500 font-mono mt-0.5">{(balance / 1000000).toFixed(6)}%</p>
            </div>
         </div>
      </div>

      <MainnetActivationCard hasLicense={hasMainnetLicense} onSuccess={onActivateMainnet} />

      {/* --- STORAGE & HISTORY --- */}
      <div className="mb-8">
         <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3 flex items-center">
            <Box size={10} className="mr-1"/> STORAGE
         </p>
         <div className="grid grid-cols-4 gap-2">
            
            <div className="aspect-square bg-gray-900 border border-cyan-500/50 rounded-lg flex flex-col items-center justify-center relative shadow-[0_0_15px_rgba(34,211,238,0.2)]">
               <div className="text-3xl drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{currentTier.icon}</div>
               <span className="text-[7px] mt-2 text-cyan-400 font-black tracking-widest bg-cyan-900/50 px-1.5 py-0.5 rounded">ACTIVE</span>
            </div>
            
            {ownedItems.map((item, idx) => (
               <div 
                 key={`item-${idx}`} 
                 onClick={() => setSelectedItem(item)}
                 className="aspect-square bg-black border border-gray-700 hover:border-cyan-500 rounded-lg flex flex-col items-center justify-center relative group cursor-pointer transition-colors shadow-lg"
               >
                  <div className="text-2xl group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                     {item.icon}
                  </div>
                  <span className="absolute bottom-1 right-1 text-[8px] font-black bg-cyan-900/80 border border-cyan-500 text-cyan-400 px-1.5 py-0.5 rounded backdrop-blur-sm">
                     x{item.qty}
                  </span>
               </div>
            ))}

            {emptySlots.map((_, idx) => (
               <div key={`empty-${idx}`} className="aspect-square bg-gray-900/30 border border-gray-800 border-dashed rounded-lg flex items-center justify-center relative">
                  <span className="text-gray-800 text-xl font-light opacity-30">+</span>
               </div>
            ))}
         </div>
      </div>

      <div>
         <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3 flex items-center">
            <Clock size={10} className="mr-1"/> LEDGER (LOCAL CACHE)
         </p>
         <div className="space-y-2">
            {transactions.length === 0 ? (
               <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800/50 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">No transactions yet</p>
               </div>
            ) : (
               transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-800/50">
                     <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-800 rounded-full text-gray-400">
                           {tx.type === 'MINE' ? <Zap size={12} /> : tx.type === 'BUY' ? <ShoppingBag size={12} /> : <Clock size={12} />}
                        </div>
                        <div>
                           <p className="text-[10px] font-black tracking-widest uppercase text-white">{tx.type}</p>
                           <p className="text-[8px] text-gray-500 uppercase truncate max-w-[120px]" title={tx.label}>{tx.label}</p>
                           <p className="text-[8px] text-gray-600 uppercase">{formatTimeAgo(tx.timestamp)}</p>
                        </div>
                     </div>
                     <span className={`text-[10px] font-mono font-bold ${String(tx.amount).startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount} RP
                     </span>
                  </div>
               ))
            )}
         </div>
      </div>

      {/* --- DEPLOYMENT MODAL --- */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
           <div className="bg-gray-900 border border-cyan-500 rounded-lg p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50 animate-pulse"></div>

              <h3 className="text-lg font-bold text-white mb-4 flex items-center uppercase tracking-widest">
                 <Activity size={18} className="mr-2 text-cyan-400"/> INITIATE PAYLOAD
              </h3>

              <div className="bg-black/50 p-4 rounded mb-6 border border-gray-800 text-center">
                 <div className="text-5xl mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{selectedItem.icon}</div>
                 <p className="text-sm font-black tracking-widest mb-1" style={{ color: selectedItem.color }}>{selectedItem.name}</p>
                 <p className="text-[10px] text-gray-400">{selectedItem.desc}</p>
                 <div className="mt-4 inline-block bg-gray-800 px-3 py-1 rounded border border-gray-700">
                    <span className="text-[9px] text-gray-400 tracking-widest uppercase">Available in Storage: </span>
                    <span className="text-[10px] font-bold text-cyan-400 ml-1">{selectedItem.qty} UNITS</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => setSelectedItem(null)}
                    className="py-3 rounded bg-gray-800 text-gray-400 font-bold text-[10px] hover:bg-gray-700 flex items-center justify-center tracking-widest"
                 >
                    <X size={14} className="mr-1"/> CANCEL
                 </button>
                 <button 
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    className="py-3 rounded bg-cyan-900/50 text-cyan-400 border border-cyan-500 font-bold text-[10px] hover:bg-cyan-400 hover:text-black flex items-center justify-center tracking-widest transition-colors"
                 >
                    {isDeploying ? (
                       <span className="animate-pulse">DECRYPTING...</span>
                    ) : (
                       <><Check size={14} className="mr-1"/> DEPLOY</>
                    )}
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;