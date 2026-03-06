import { useState, useRef, useEffect } from 'react';
import { Camera, Eye, Lock, X } from 'lucide-react';

const CORPORATE_BOUNTIES = [
  { id: 'urban-transit', name: 'Urban Transit Node', baseRP: 200, multiplier: 3 },
  { id: 'coffee-front', name: 'Local Coffee Front', baseRP: 150, multiplier: 5 },
  { id: 'neon-signage', name: 'Neon Signage', baseRP: 300, multiplier: 3 },
];

const AI_ANALYSIS_MESSAGES = [
  'Uploading to secure server...',
  'Running image recognition...',
  'Verifying street-level data...',
  'Bounty Confirmed.',
];

const UPLINK_COMPLETED_KEY = 'sonar_uplink_completed';

function Uplink({ addTransaction }) {
  const [hasTier3License, setHasTier3License] = useState(false);
  const [completedBounties, setCompletedBounties] = useState(() => {
    try {
      const raw = localStorage.getItem(UPLINK_COMPLETED_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [selectedBounty, setSelectedBounty] = useState(null);
  const [capturePhase, setCapturePhase] = useState('idle'); // 'idle' | 'capture' | 'analyzing' | 'success'
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisMessage, setAnalysisMessage] = useState('');

  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (completedBounties.length === 0) return;
    try {
      localStorage.setItem(UPLINK_COMPLETED_KEY, JSON.stringify(completedBounties));
    } catch (_) {}
  }, [completedBounties]);

  const totalReward = selectedBounty
    ? selectedBounty.baseRP * selectedBounty.multiplier
    : 0;

  const handleAcceptBounty = (bounty) => {
    if (completedBounties.includes(bounty.id)) return;
    setSelectedBounty(bounty);
    setCapturePhase('capture');
  };

  const handleTriggerCamera = () => {
    if (cameraInputRef.current) cameraInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    e.target.value = '';
    const bounty = selectedBounty;
    if (!bounty) return;
    const reward = bounty.baseRP * bounty.multiplier;

    setCapturePhase('analyzing');
    setAnalysisProgress(0);
    setAnalysisMessage(AI_ANALYSIS_MESSAGES[0]);

    const duration = 4000;
    const start = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setAnalysisProgress(pct);
      const idx = Math.min(
        Math.floor((elapsed / duration) * AI_ANALYSIS_MESSAGES.length),
        AI_ANALYSIS_MESSAGES.length - 1
      );
      setAnalysisMessage(AI_ANALYSIS_MESSAGES[idx]);
    }, 150);

    const done = setTimeout(() => {
      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setAnalysisMessage('Bounty Confirmed.');
      setCapturePhase('success');

      if (typeof addTransaction === 'function') {
        addTransaction('UPLINK', `+${reward}`, `Corporate Bounty: ${bounty.name}`);
      }
      setCompletedBounties((prev) => (prev.includes(bounty.id) ? prev : [...prev, bounty.id]));
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(done);
    };
  };

  const closeCaptureOverlay = () => {
    setSelectedBounty(null);
    setCapturePhase('idle');
    setAnalysisProgress(0);
    setAnalysisMessage('');
  };

  if (!hasTier3License) {
    return (
      <div className="relative flex flex-col min-h-full w-full bg-black text-white overflow-hidden">
        {/* Blurred bounty board tease */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="p-6 pt-20 opacity-60 blur-md pointer-events-none select-none">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
                <Camera size={28} className="text-purple-400" />
              </div>
              <h1 className="text-lg font-black tracking-[0.2em] uppercase">UPLINK // SECURE CORPORATE CHANNEL</h1>
            </div>
            <div className="space-y-4">
              {CORPORATE_BOUNTIES.map((b) => (
                <div key={b.id} className="p-4 rounded-xl bg-gray-900/80 border border-gray-700">
                  <p className="text-sm font-bold text-gray-300">{b.name}</p>
                  <p className="text-[10px] text-gray-500">{b.baseRP} RP × {b.multiplier}x</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ENCRYPTED overlay */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-full p-8 bg-black/85 backdrop-blur-sm">
          <div className="flex flex-col items-center max-w-sm text-center">
            <div className="p-4 rounded-full bg-red-950/50 border-2 border-red-500/50 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <Lock size={48} className="text-red-500" />
            </div>
            <h2 className="text-xl font-black tracking-[0.2em] uppercase text-red-500 mb-2">
              ENCRYPTED
            </h2>
            <p className="text-sm text-gray-400 tracking-wider mb-8">
              CLEARANCE DENIED. TIER 3 LICENSE REQUIRED.
            </p>
            <button
              type="button"
              onClick={() => setHasTier3License(true)}
              className="w-full py-4 px-6 rounded-xl font-black text-sm tracking-widest uppercase bg-red-900/50 border-2 border-red-500 text-red-400 hover:bg-red-900/70 hover:border-red-400 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]"
            >
              PURCHASE TIER 3 LICENSE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full w-full bg-black text-white overflow-y-auto pb-24">
      <div className="p-6 pt-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <Eye size={28} className="text-purple-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-[0.25em] uppercase text-white">
              UPLINK // SECURE CORPORATE CHANNEL
            </h1>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase mt-0.5">
              Street-level visual data · Corporate bounties
            </p>
          </div>
        </div>

        {/* Bounty cards */}
        <div className="space-y-4">
          {CORPORATE_BOUNTIES.map((bounty) => {
            const total = bounty.baseRP * bounty.multiplier;
            return (
              <div
                key={bounty.id}
                className="p-5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-purple-500/30 transition-colors shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm font-black tracking-wider uppercase text-white">
                      Target: {bounty.name}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Base {bounty.baseRP} RP × {bounty.multiplier}x Syndicate Multiplier
                    </p>
                  </div>
                  <span className="text-sm font-mono font-bold text-green-400">
                    {total} RP
                  </span>
                </div>
                <button
                  type="button"
                  disabled={completedBounties.includes(bounty.id)}
                  onClick={() => handleAcceptBounty(bounty)}
                  className={`w-full py-3 rounded-lg font-black text-[10px] tracking-widest uppercase transition-all ${
                    completedBounties.includes(bounty.id)
                      ? 'bg-gray-800/50 border border-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-900/40 border border-purple-500/50 text-purple-300 hover:bg-purple-900/60 hover:border-purple-400'
                  }`}
                >
                  {completedBounties.includes(bounty.id) ? 'TRANSMITTED' : 'ACCEPT BOUNTY'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden camera input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        id="cameraInput"
        onChange={handleFileChange}
      />

      {/* Data Capture Mode overlay */}
      {capturePhase === 'capture' && selectedBounty && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="absolute top-6 right-6">
            <button
              type="button"
              onClick={closeCaptureOverlay}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <h2 className="text-sm font-black tracking-widest uppercase text-purple-400 mb-2">
            Data Capture Mode
          </h2>
          <p className="text-[10px] text-gray-500 mb-8 uppercase tracking-wider">
            {selectedBounty.name} · {selectedBounty.baseRP * selectedBounty.multiplier} RP
          </p>
          <label
            htmlFor="cameraInput"
            className="flex items-center justify-center gap-2 w-full max-w-xs py-5 rounded-xl font-black text-sm tracking-widest uppercase bg-purple-900/50 border-2 border-purple-500 text-purple-300 hover:bg-purple-900/70 hover:border-purple-400 cursor-pointer transition-all shadow-[0_0_25px_rgba(168,85,247,0.3)]"
          >
            <Camera size={22} />
            INITIALIZE OPTICS
          </label>
        </div>
      )}

      {/* AI Analysis overlay */}
      {capturePhase === 'analyzing' && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 bg-black/95 backdrop-blur-md">
          <h2 className="text-sm font-black tracking-widest uppercase text-purple-400 mb-6">
            AI Analysis
          </h2>
          <p className="text-[11px] text-gray-400 font-mono mb-4 min-h-[1.5rem]">
            {analysisMessage}
          </p>
          <div className="w-full max-w-xs h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-150"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success overlay */}
      {capturePhase === 'success' && selectedBounty && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-8 bg-black/95 backdrop-blur-md">
          <div className="p-6 rounded-2xl bg-green-950/30 border-2 border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.25)] text-center max-w-sm">
            <p className="text-lg font-black tracking-widest uppercase text-green-400 mb-2">
              DATA SOLD. SYNDICATE MULTIPLIER APPLIED.
            </p>
            <p className="text-2xl font-mono font-bold text-white mb-6">
              +{totalReward} RP
            </p>
            <button
              type="button"
              onClick={closeCaptureOverlay}
              className="w-full py-3 rounded-lg font-black text-[10px] tracking-widest uppercase bg-green-900/50 border border-green-500 text-green-400 hover:bg-green-900/70 transition-colors"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Uplink;
