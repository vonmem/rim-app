import { useState, useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';

const MiningRig = ({ status, currentTier, isOverheated, toggleMining }) => {
  const [shards, setShards] = useState([]);
  const shardInterval = useRef(null);

  // --- VISUAL RAIN ENGINE ---
  useEffect(() => {
    if (status === 'MINING') {
      // Start Rain
      shardInterval.current = setInterval(() => {
        const id = Math.random();
        const left = Math.random() * 90 + 5; 
        const duration = Math.random() * 1.5 + 0.5; 
        const color = isOverheated ? '#EF4444' : (currentTier.color === '#FFFFFF' ? '#06b6d4' : currentTier.color);
        
        setShards(prev => [...prev, { id, left, duration, color }]);
        
        // Cleanup individual shard after animation
        setTimeout(() => setShards(prev => prev.filter(s => s.id !== id)), duration * 1000);
      }, 300);
    } else {
      // Stop Rain
      if (shardInterval.current) clearInterval(shardInterval.current);
      setShards([]);
    }

    return () => clearInterval(shardInterval.current);
  }, [status, isOverheated, currentTier]);

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-10 z-10">
      
      {/* CSS Animations (Scoped) */}
      <style>{`
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
      <div onClick={toggleMining} className="relative w-80 h-80 flex items-center justify-center cursor-pointer group z-10">
        
        {/* 1. IMAGE BACKGROUND */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${status === 'MINING' ? 'scale-105 contrast-110' : 'scale-100 opacity-50 grayscale'}`}>
           {currentTier.id >= 7.1 ? (
             <Eye size={180} strokeWidth={1} style={{ color: isOverheated ? '#EF4444' : currentTier.color, filter: isOverheated ? 'drop-shadow(0 0 20px red)' : `drop-shadow(0 0 50px ${currentTier.color})` }} className="animate-pulse" />
           ) : (
             <img 
               src="/scout.png" 
               alt="Neural Core" 
               className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]"
             />
           )}
        </div>

        {/* 2. PULSING RINGS */}
        {status === 'MINING' && currentTier.id < 7.1 && (
          <>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 rounded-full animate-[ripple_3s_infinite_linear] z-10 ${isOverheated ? 'border-red-500/50' : 'border-cyan-500/30'}`}></div>
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 rounded-full animate-[ripple_2s_infinite_linear_0.5s] z-10 ${isOverheated ? 'border-red-500/40' : 'border-cyan-400/20'}`}></div>
          </>
        )}
        
        {/* 3. STATUS TEXT */}
        <div className="absolute -bottom-12 text-[10px] tracking-[0.5em] text-cyan-500 font-bold animate-pulse z-20 whitespace-nowrap">
           {isOverheated ? 'OVERHEATED' : (status === 'MINING' ? `NEURAL UPLINK ACTIVE` : 'TAP CORE TO INITIALIZE')}
        </div>
      </div>
    </div>
  );
};

export default MiningRig;