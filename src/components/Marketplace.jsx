import React, { useState } from 'react';
import { Shield, ShoppingBag, X, Check, ShieldCheck, Zap, Lock, Unlock, Cpu, Activity } from 'lucide-react';

// 🚨 WEB3 & PRIVY IMPORTS
import { useWallets } from '@privy-io/react-auth';
import { useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

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

// --- MAIN MARKETPLACE COMPONENT ---
// 🚨 Added hasMainnetLicense and onActivateMainnet to the props
const Marketplace = ({ TIERS, CONSUMABLES, balance, userInventory, onBuyItem, buyBlackMarketItem, hasMainnetLicense, onActivateMainnet }) => {
  const [confirmItem, setConfirmItem] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const executePurchase = async (autoDeploy = false) => {
    if (!confirmItem) return;
    setLoadingId(confirmItem.id);
    
    if (confirmItem.type === 'RIG' || confirmItem.type === 'GOD') {
        await onBuyItem(confirmItem);
    } else {
        await buyBlackMarketItem(confirmItem, autoDeploy);
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

      {/* 🚨 SECTION 1: MAINNET ACTIVATION (WEB3) */}
      <MainnetActivationCard 
        hasLicense={hasMainnetLicense} 
        onSuccess={onActivateMainnet} 
      />

      {/* SECTION 2: CONTRABAND (Consumables & Boosters) */}
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

      {/* SECTION 3: HARDWARE (The Trading Card Gallery) */}
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
                    setConfirmItem(tier);
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
                      {confirmItem.type === 'PREMIUM' ? confirmItem.costCrypto : 
                       confirmItem.costRP ? `${confirmItem.costRP.toLocaleString()} RP` : 
                       typeof confirmItem.threshold === 'number' ? `${confirmItem.threshold.toLocaleString()} RP` : 
                       confirmItem.threshold}
                    </p>
                 </div>
                 
                 <p className="text-[10px] text-gray-400">
                    {confirmItem.desc || `Permanently unlocks ${confirmItem.multiplier}x base mining power.`}
                 </p>
              </div>

              {(confirmItem.type === 'RIG' || confirmItem.type === 'GOD') ? (
                 <div className="grid grid-cols-2 gap-3 mt-2">
                    <button 
                       onClick={() => setConfirmItem(null)}
                       className="py-3 rounded bg-gray-800 text-gray-400 font-bold text-[10px] hover:bg-gray-700 flex items-center justify-center tracking-widest"
                    >
                       <X size={14} className="mr-1"/> CANCEL
                    </button>
                    <button 
                       onClick={() => executePurchase(false)}
                       disabled={loadingId === confirmItem.id}
                       className="py-3 rounded bg-white text-black font-bold text-[10px] hover:bg-cyan-400 hover:text-black flex items-center justify-center tracking-widest transition-colors"
                    >
                       {loadingId === confirmItem.id ? 'PROCESSING...' : <><Check size={14} className="mr-1"/> CONFIRM</>}
                    </button>
                 </div>
              ) : (
                 <div className="flex flex-col space-y-3 mt-2">
                    <div className="grid grid-cols-2 gap-3">
                       <button 
                          onClick={() => executePurchase(false)}
                          disabled={loadingId === confirmItem.id}
                          className="py-3 rounded bg-gray-800 text-gray-300 border border-gray-600 font-bold text-[9px] hover:bg-gray-700 hover:text-white flex items-center justify-center tracking-widest transition-colors"
                       >
                          {loadingId === confirmItem.id ? '...' : 'BUY & STASH'}
                       </button>
                       <button 
                          onClick={() => executePurchase(true)}
                          disabled={loadingId === confirmItem.id}
                          className="py-3 rounded bg-cyan-900/50 text-cyan-400 border border-cyan-500 font-bold text-[9px] hover:bg-cyan-400 hover:text-black flex items-center justify-center tracking-widest transition-colors shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                       >
                          {loadingId === confirmItem.id ? 'PROCESSING...' : 'BUY & INJECT'}
                       </button>
                    </div>
                    <button 
                       onClick={() => setConfirmItem(null)}
                       className="py-2 rounded text-gray-500 font-bold text-[10px] hover:text-white flex items-center justify-center tracking-widest"
                    >
                       <X size={14} className="mr-1"/> CANCEL
                    </button>
                 </div>
              )}

           </div>
        </div>
      )}

    </div>
  );
};

export default Marketplace;