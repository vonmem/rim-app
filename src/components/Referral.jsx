import { useState, useCallback } from 'react';
import { Globe, Copy, Check } from 'lucide-react';

function generateReferralCode() {
  const hex = Array.from({ length: 6 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('');
  return `SYN-${hex}`;
}

const Referral = ({
  addTransaction,
  hasBotnetActive = false,
  referralCount: propReferralCount,
  currentTier,
  onInvite,
}) => {
  const [referralCode] = useState(() => {
    // TODO: Supabase – load from users.referral_code or generate and persist once; ensure referred_by is set when new users sign up via ref link
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sonar_referral_code');
      if (stored) return stored;
      const code = generateReferralCode();
      localStorage.setItem('sonar_referral_code', code);
      return code;
    }
    return generateReferralCode();
  });
  // TODO: Supabase – fetch real count from users where referred_by = current user id; pendingYield from aggregate of recruits' activity
  const [totalRecruits, setTotalRecruits] = useState(propReferralCount ?? 3);
  const [pendingYield, setPendingYield] = useState(450);
  const [copied, setCopied] = useState(false);

  const displayYield = hasBotnetActive ? pendingYield * 2 : pendingYield;

  const directLink = typeof window !== 'undefined'
    ? `https://t.me/RIM_Protocol_Bot/start?startapp=ref_${referralCode.replace('SYN-', '')}`
    : '#';

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(directLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      setCopied(false);
    }
  }, [directLink]);

  const handleExtract = useCallback(() => {
    if (displayYield <= 0) return;
    try {
      if (navigator.vibrate) navigator.vibrate([50, 50, 100]);
    } catch (_) {}
    if (typeof addTransaction === 'function') {
      addTransaction('NETWORK', `+${displayYield}`, 'Extracted from Syndicate Recruits');
    }
    setPendingYield(0);
  }, [displayYield, addTransaction]);

  return (
    <div className="flex flex-col min-h-full w-full bg-black text-white overflow-y-auto pb-24">
      <div className="p-6 pt-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <Globe size={28} className="text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-[0.25em] uppercase text-white">
              SYNDICATE NETWORK // RECRUITMENT
            </h1>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase mt-0.5">
              Recruit nodes · Claim yield
            </p>
          </div>
        </div>

        {/* Your Code */}
        <div className="mb-6">
          <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-2">Your Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-lg font-bold tracking-widest bg-gray-900 border border-cyan-500/50 rounded-lg px-4 py-3 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              {referralCode}
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-black text-[10px] tracking-widest uppercase border-2 transition-all ${
                copied
                  ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400'
                  : 'bg-cyan-900/40 border-cyan-500 text-cyan-400 hover:bg-cyan-900/60'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'COPIED!' : 'COPY DIRECT LINK'}
            </button>
          </div>
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-1">Total Recruits</p>
            <p className="text-2xl font-mono font-bold text-white">{propReferralCount ?? totalRecruits}</p>
            {/* TODO: Supabase – fetch real count from users where referred_by = current user id */}
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 tracking-widest uppercase mb-1">Pending Yield</p>
            <p className="text-2xl font-mono font-bold text-cyan-400">{displayYield} RP</p>
          </div>
        </div>

        {/* Botnet 2x banner */}
        {hasBotnetActive && (
          <div className="mb-6 p-4 rounded-xl border-2 border-red-500 bg-red-950/40 text-red-400 shadow-[0_0_25px_rgba(239,68,68,0.25)]">
            <p className="text-xs font-black tracking-widest uppercase">⚠️ BOTNET INJECTION ACTIVE: 2X YIELD</p>
            <p className="text-[10px] text-red-300/90 mt-1">Network yield doubled for the duration of the buff.</p>
          </div>
        )}

        {/* Extract button */}
        <button
          type="button"
          onClick={handleExtract}
          disabled={displayYield <= 0}
          className={`w-full py-5 rounded-xl font-black text-sm tracking-[0.2em] uppercase border-2 transition-all ${
            displayYield <= 0
              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-cyan-900/40 border-cyan-500 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)] active:scale-[0.98]'
          }`}
        >
          EXTRACT NETWORK YIELD
        </button>

        {currentTier && (
          <div className="mt-6 p-4 rounded-lg bg-gray-900/50 border border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Bandwidth</p>
            <p className="text-xs font-bold text-cyan-400 mt-0.5">{(propReferralCount ?? totalRecruits)} / {currentTier.bandwidth} nodes</p>
          </div>
        )}

        {typeof onInvite === 'function' && (
          <button
            type="button"
            onClick={onInvite}
            className="mt-4 w-full py-3 rounded-lg font-black text-[10px] tracking-widest uppercase bg-cyan-500 text-black hover:bg-cyan-400 transition-colors"
          >
            INITIATE RECRUITMENT
          </button>
        )}
      </div>
    </div>
  );
};

export default Referral;
