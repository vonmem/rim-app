import React, { useState, useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';

const DEFAULT_TIER = { id: 1, name: 'SCOUT', color: '#06b6d4', narrative: 'ENERGY DEPLETED' };

const MiningRig = ({
  status = 'IDLE',
  currentTier,
  isOverheated = false,
  toggleMining = () => {},
}) => {
  const [shards, setShards] = useState([]);
  const [renderError, setRenderError] = useState(false);
  const shardInterval = useRef(null);

  const safeTier = currentTier && typeof currentTier === 'object' ? currentTier : DEFAULT_TIER;
  const safeColor = safeTier.color === '#FFFFFF' ? '#06b6d4' : (safeTier.color || '#06b6d4');

  if (renderError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 bg-red-950/80 border-2 border-red-500 rounded-xl text-red-400 text-center">
        <p className="text-sm font-black tracking-widest uppercase">CONNECTION ERROR</p>
        <p className="text-[10px] mt-2 text-red-300/80">Neural uplink unavailable. Retry from the Grid.</p>
      </div>
    );
  }

  // --- VISUAL RAIN ENGINE (With Memory Leak Protection) ---
  useEffect(() => {
    if (status === 'MINING') {
      try {
      // 1. Start Rain (Capped at 20 shards maximum)
      shardInterval.current = setInterval(() => {
        setShards(prev => {
          if (prev.length >= 20) return prev; // 🚨 Protects GPU from crashing
          
          const id = Math.random();
          const left = Math.random() * 90 + 5; 
          const duration = Math.random() * 1.5 + 0.5; 
          const color = isOverheated ? '#EF4444' : safeColor;
          
          return [...prev, { id, left, duration, color, birth: Date.now() }];
        });
      }, 300);

      // 2. Safe Cleanup Sweeper
      const cleanupInterval = setInterval(() => {
         const now = Date.now();
         setShards(prev => prev.filter(s => now - s.birth < s.duration * 1000));
      }, 1000);

      return () => {
         clearInterval(shardInterval.current);
         clearInterval(cleanupInterval);
      };
      } catch (e) {
        setRenderError(true);
      }
    } else {
      // Stop Rain
      if (shardInterval.current) clearInterval(shardInterval.current);
      setShards([]);
    }
  }, [status, isOverheated, safeColor]);

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-10 z-10">
      
      {/* CSS Animations */}
      <style>{`
        /* 🚨 FIX: Using scale only, avoiding translation overwrites */
        @keyframes ripple {
          0% { transform: scale(0.8); opacity: 0.6; border-width: 2px; }
          100% { transform: scale(2.5); opacity: 0; border-width: 0px; }
        }
        @keyframes floatUp {
          0% { bottom: -10px; opacity: 0; }
          10% { opacity: 1; }
          100% { bottom: 70%; opacity: 0; }
        }
      `}</style>

      {/* SHARDS LAYER */}
      {shards.map(shard => (
        <div
          key={shard.id}
          className="absolute w-[2px] h-[6px] rounded-full z-0"
          style={{
            left: `${shard.left}%`,
            bottom: 0, 
            backgroundColor: shard.color,
            boxShadow: `0 0 8px ${shard.color}`,
            animation: `floatUp ${shard.duration}s linear forwards`
          }}
        ></div>
      ))}

      {/* THE BAT-CORE */}
      <div onClick={typeof toggleMining === 'function' ? toggleMining : undefined} className="relative w-80 h-80 flex items-center justify-center cursor-pointer group z-10">
        
        {/* 1. IMAGE BACKGROUND */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${status === 'MINING' ? 'scale-105 contrast-110' : 'scale-100 opacity-50 grayscale'}`}>
           {(safeTier.id >= 7.1) ? (
             <Eye size={180} strokeWidth={1} style={{ color: isOverheated ? '#EF4444' : safeColor, filter: isOverheated ? 'drop-shadow(0 0 20px red)' : `drop-shadow(0 0 50px ${safeColor})` }} className="animate-pulse" />
           ) : (
             <img 
               src="/scout.png" 
               alt="Neural Core" 
               className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]"
             />
           )}
        </div>

        {/* 2. PULSING RINGS (Restored perfectly) */}
        {status === 'MINING' && safeTier.id < 7.1 && (
          <>
            <div className={`absolute top-[10%] left-[10%] w-[80%] h-[80%] border-2 rounded-full animate-[ripple_3s_infinite_linear] z-10 pointer-events-none ${isOverheated ? 'border-red-500/50' : 'border-cyan-500/30'}`}></div>
            <div className={`absolute top-[20%] left-[20%] w-[60%] h-[60%] border-2 rounded-full animate-[ripple_2s_infinite_linear_0.5s] z-10 pointer-events-none ${isOverheated ? 'border-red-500/40' : 'border-cyan-400/20'}`}></div>
          </>
        )}
        
        {/* 3. STATUS TEXT */}
        <div className="absolute -bottom-12 text-[10px] tracking-[0.5em] text-cyan-500 font-bold animate-pulse z-20 whitespace-nowrap">
           {isOverheated ? (safeTier.narrative || 'OVERHEATED') : (status === 'MINING' ? 'NEURAL UPLINK ACTIVE' : 'TAP CORE TO INITIALIZE')}
        </div>
      </div>
    </div>
  );
};

export default MiningRig;