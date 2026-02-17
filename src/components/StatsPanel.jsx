import { useState, useEffect, useRef } from 'react';

const StatsPanel = ({ status, isOverheated, currentTier, effectiveMultiplier, baseRate, referralRate }) => {
  const [logs, setLogs] = useState([]);
  const [npuLoad, setNpuLoad] = useState(0);
  
  const logInterval = useRef(null);
  const hardwareInterval = useRef(null);

  // --- LOGIC LOOP ---
  useEffect(() => {
    if (status === 'MINING') {
      
      // Hardware Simulation
      hardwareInterval.current = setInterval(() => {
        setNpuLoad(Math.floor(Math.random() * (99 - 80 + 1) + 80));
      }, 2000);

      // Logs Simulation
      const logOptions = [`Hash Verified`, `NPU Optimized`, `Packet Sent`, `Uplink Stable`, `Neural Sync Complete`];
      logInterval.current = setInterval(() => {
        const l = logOptions[Math.floor(Math.random() * logOptions.length)];
        setLogs(prev => [l, ...prev].slice(0, 5));
      }, 1200);

    } else {
      if (hardwareInterval.current) clearInterval(hardwareInterval.current);
      if (logInterval.current) clearInterval(logInterval.current);
      setLogs([]);
      setNpuLoad(0);
    }

    return () => {
      clearInterval(hardwareInterval.current);
      clearInterval(logInterval.current);
    };
  }, [status]);

  return (
    <div className="w-full max-w-xs mx-auto mt-4 bg-gray-900/30 border border-gray-800 p-4 rounded backdrop-blur-sm z-20 relative">
       
       <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[8px] text-gray-600 uppercase">Hashrate</p>
            <p className="text-xs font-bold text-cyan-400">{npuLoad} H/s</p>
          </div>
          <div>
            <p className="text-[8px] text-gray-600 uppercase">Yield</p>
            <p className={`text-xs font-bold ${isOverheated ? 'text-yellow-500' : 'text-green-500'}`}>
              {status === 'MINING' 
                ? ((baseRate * effectiveMultiplier) + referralRate).toFixed(2) + '/s' 
                : '0/s'
              }
            </p>
          </div>
       </div>

       {isOverheated && (
         <div className="text-[8px] text-red-500 text-center border-t border-gray-800 pt-2 font-bold animate-pulse">
           MULTIPLIER REDUCED TO 5x
         </div>
       )}

       <div className="space-y-1 border-t border-gray-800 pt-2 mt-2 min-h-[60px]">
          {logs.map((l, i) => (
            <div key={i} className="text-[9px] text-gray-500 font-mono tracking-tighter">
              {'>'} {l}
            </div>
          ))}
       </div>
    </div>
  );
};

export default StatsPanel;