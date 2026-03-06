import { useState, useEffect, useCallback } from 'react';
import { Wifi, Radio, ArrowLeft } from 'lucide-react';

const COOLDOWN_KEY = 'sonar_nomad_cooldown';
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

const SCAN_MESSAGES = [
  'Bypassing firewall...',
  'Measuring latency...',
  'Classifying node...',
  'Mapping infrastructure...',
];

function getConnectionData() {
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const conn = nav?.connection ?? nav?.mozConnection ?? nav?.webkitConnection;

  if (conn) {
    const rtt = conn.rtt != null && conn.rtt > 0 ? conn.rtt : null;
    const downlink = conn.downlink != null ? conn.downlink : null;
    return {
      pingMs: rtt ?? Math.round(10 + Math.random() * 140),
      speedMbps: downlink != null ? Math.round(downlink * 10) / 10 : Math.round(5 + Math.random() * 95),
    };
  }
  return {
    pingMs: Math.round(10 + Math.random() * 140),
    speedMbps: Math.round((5 + Math.random() * 95) * 10) / 10,
  };
}

function classifyNode(pingMs) {
  if (pingMs < 30) return { label: 'Prime Nomad Hub', reward: 100 };
  if (pingMs < 100) return { label: 'Standard Node', reward: 50 };
  return { label: 'Fringe Connection', reward: 25 };
}

function Nomad({ addTransaction, setTab }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [lastPingTime, setLastPingTime] = useState(() => {
    try {
      const raw = localStorage.getItem(COOLDOWN_KEY);
      const t = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(t) ? t : 0;
    } catch {
      return 0;
    }
  });
  const [lastResult, setLastResult] = useState(null);
  const [networkLog, setNetworkLog] = useState([]);

  const remainingCooldownMs = lastPingTime > 0 ? Math.max(0, lastPingTime + COOLDOWN_MS - Date.now()) : 0;
  const isOnCooldown = remainingCooldownMs > 0;

  const formatCooldown = useCallback((ms) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (lastPingTime <= 0) return;
    try {
      localStorage.setItem(COOLDOWN_KEY, String(lastPingTime));
    } catch (_) {}
  }, [lastPingTime]);

  const runScan = useCallback(() => {
    if (isScanning || isOnCooldown) return;

    setIsScanning(true);
    setLastResult(null);
    let step = 0;
    const interval = setInterval(() => {
      setScanMessage(SCAN_MESSAGES[step % SCAN_MESSAGES.length]);
      step++;
    }, 700);

    const duration = 3000 + Math.random() * 1000;
    const finishAt = Date.now() + duration;

    const timeout = setTimeout(() => {
      clearInterval(interval);
      const { pingMs, speedMbps } = getConnectionData();
      const { label, reward } = classifyNode(pingMs);
      const result = { pingMs, speedMbps, label, reward, timestamp: Date.now() };
      setLastResult(result);
      setLastPingTime(Date.now());
      setNetworkLog((prev) => [result, ...prev].slice(0, 20));
      setScanMessage('');
      setIsScanning(false);

      if (typeof addTransaction === 'function') {
        addTransaction('NOMAD', `+${result.reward}`, 'Network Ping');
      }
    }, duration);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isScanning, isOnCooldown, addTransaction]);

  const [cooldownDisplay, setCooldownDisplay] = useState('');
  useEffect(() => {
    if (!isOnCooldown) {
      setCooldownDisplay('');
      return;
    }
    const tick = () => {
      const left = Math.max(0, lastPingTime + COOLDOWN_MS - Date.now());
      setCooldownDisplay(formatCooldown(left));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isOnCooldown, lastPingTime, formatCooldown]);

  const buttonDisabled = isScanning || isOnCooldown;
  const buttonLabel = isScanning
    ? scanMessage
    : isOnCooldown
    ? `COOLDOWN ${cooldownDisplay}`
    : 'INITIATE PING';

  return (
    <div className="flex flex-col min-h-full w-full bg-black text-white overflow-y-auto pb-24">
      <div className="p-6 pt-20">
        {typeof setTab === 'function' && (
          <button
            type="button"
            onClick={() => setTab('MISSIONS')}
            className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white text-[10px] font-bold tracking-widest uppercase transition-colors"
          >
            <ArrowLeft size={14} />
            BACK TO MISSIONS
          </button>
        )}
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <Wifi size={28} className="text-purple-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-[0.25em] uppercase text-white">
              NOMAD // NETWORK SCANNER
            </h1>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase mt-0.5">
              Ping local infrastructure · Earn RP
            </p>
          </div>
        </div>

        {/* Central Ping Button */}
        <div className="flex flex-col items-center mb-10">
          <button
            type="button"
            onClick={runScan}
            disabled={buttonDisabled}
            className={`
              w-full max-w-sm py-6 rounded-xl font-black text-sm tracking-[0.2em] uppercase
              border-2 transition-all duration-300
              ${buttonDisabled
                ? 'bg-gray-900/50 border-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-purple-900/30 border-purple-500 text-purple-300 hover:bg-purple-900/50 hover:border-purple-400 hover:text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] active:scale-[0.98]'
              }
            `}
          >
            {isScanning ? (
              <span className="flex items-center justify-center gap-2">
                <Radio size={18} className="animate-pulse" />
                {buttonLabel}
              </span>
            ) : (
              buttonLabel
            )}
          </button>
          {isOnCooldown && (
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-2">
              Next ping available when timer ends
            </p>
          )}
        </div>

        {/* Scan Complete Card */}
        {lastResult && !isScanning && (
          <div className="mb-8 p-5 rounded-xl bg-gradient-to-br from-purple-950/40 to-black border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.2)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-xs font-black tracking-widest uppercase text-green-400">
                Scan Complete
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider">Ping</p>
                <p className="text-lg font-mono font-bold text-white">{lastResult.pingMs} ms</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider">Speed</p>
                <p className="text-lg font-mono font-bold text-white">{lastResult.speedMbps} Mbps</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-purple-500/20">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                {lastResult.label}
              </span>
              <span className="text-sm font-mono font-black text-green-400">
                +{lastResult.reward} RP
              </span>
            </div>
          </div>
        )}

        {/* Network Log */}
        <div>
          <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-3 flex items-center gap-1">
            <Radio size={10} /> Network Log
          </p>
          <div className="space-y-2">
            {networkLog.length === 0 ? (
              <div className="p-4 rounded-lg bg-gray-900/30 border border-gray-800 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  No pings yet. Initiate a scan above.
                </p>
              </div>
            ) : (
              networkLog.map((entry, idx) => (
                <div
                  key={`${entry.timestamp}-${idx}`}
                  className="flex justify-between items-center p-3 rounded-lg bg-gray-900/50 border border-gray-800/50"
                >
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-white uppercase">
                      {entry.label}
                    </p>
                    <p className="text-[9px] text-gray-500 font-mono">
                      {entry.pingMs} ms · {entry.speedMbps} Mbps
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-green-500">
                    +{entry.reward} RP
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Nomad;
