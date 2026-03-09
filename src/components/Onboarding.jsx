import { useState } from 'react';

const FTUE_STEPS = [
  {
    title: 'DATA IS POWER.',
    sub: 'Welcome to the Syndicate. Your device is now a secure DePIN node. Passive mining begins when you bring your rig online.',
    button: 'INITIALIZE NODE',
  },
  {
    title: 'YOUR RIG IS ONLINE.',
    sub: 'Your node passively extracts RP. Manage your hardware limits and bypass cooldowns in the Black Market.',
    button: 'ACKNOWLEDGE',
  },
  {
    title: 'THE GRID AWAITS.',
    sub: 'Step outside. Map hexes on foot to earn RP and find Encrypted Caches. Vehicles will trigger anti-cheat.',
    button: 'ENTER THE RIM',
  },
];

function Onboarding({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = FTUE_STEPS[currentStep];
  const isLast = currentStep === 2;

  const handleAction = () => {
    if (isLast) {
      try {
        if (navigator.vibrate) navigator.vibrate([100, 50, 200]);
      } catch (_) {}
      try {
        localStorage.setItem('sonar_ftue_completed', 'true');
      } catch (_) {}
      typeof onComplete === 'function' && onComplete();
      return;
    }
    setCurrentStep((s) => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[50] bg-black flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* CRT scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.5) 2px, rgba(0,0,0,0.5) 4px)',
        }}
      />

      {/* Content */}
      <div className="relative z-0 max-w-md w-full text-center">
        <h1 className="text-2xl md:text-3xl font-black tracking-[0.3em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 animate-pulse-slow mb-6">
          {step.title}
        </h1>
        <p className="text-sm text-gray-400 leading-relaxed tracking-wider mb-10 px-2">
          {step.sub}
        </p>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-10">
          {FTUE_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentStep ? 'bg-cyan-500 w-6 shadow-[0_0_10px_rgba(34,211,238,0.8)]' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleAction}
          className="w-full max-w-sm mx-auto py-5 rounded-xl font-black text-sm tracking-[0.25em] uppercase border-2 border-cyan-500 bg-cyan-950/40 text-cyan-300 shadow-[0_0_35px_rgba(34,211,238,0.5)] hover:shadow-[0_0_45px_rgba(34,211,238,0.6)] hover:border-cyan-400 active:scale-95 transition-all duration-150"
        >
          {step.button}
        </button>
      </div>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default Onboarding;
