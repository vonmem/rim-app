import { Zap, Crosshair, Eye, Signal } from 'lucide-react';

const TASKS = [
  {
    id: 'PASSIVE',
    title: 'Passive Node',
    description: 'Background compute mining. Requires cooling management.',
    reward: 'Baseline RP',
    status: 'ACTIVE',
    statusLabel: 'ACTIVE',
    disabled: false,
    Icon: Zap,
    accent: 'cyan',
  },
  {
    id: 'CARTOGRAPHER',
    title: 'Cartographer',
    description: 'Active GPS telemetry. Map physical sectors for the synthetic extraction grid.',
    reward: '+50 RP per 50m',
    status: 'AVAILABLE',
    statusLabel: 'AVAILABLE',
    disabled: false,
    Icon: Crosshair,
    accent: 'green',
  },
  {
    id: 'UPLINK',
    title: 'Uplink [Visual AI]',
    description: 'Bounty hunting. Provide street-level visual data for corporate clients.',
    reward: 'High Yield Multipliers',
    status: 'LOCKED',
    statusLabel: 'REQUIRES TIER 3 LICENSE',
    disabled: true,
    Icon: Eye,
    accent: 'amber',
  },
  {
    id: 'NOMAD',
    title: 'Nomad [Connectivity]',
    description: 'Ping local networks to map global digital nomad infrastructure.',
    reward: '—',
    status: 'IN_DEVELOPMENT',
    statusLabel: 'OFFLINE',
    disabled: true,
    Icon: Signal,
    accent: 'gray',
  },
];

const accentStyles = {
  cyan: 'border-cyan-500/50 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.15)]',
  green: 'border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  amber: 'border-amber-500/30 text-amber-400/80',
  gray: 'border-gray-600/30 text-gray-500',
};

const accentGlow = {
  cyan: 'bg-cyan-500/10',
  green: 'bg-emerald-500/10',
  amber: 'bg-amber-500/5',
  gray: 'bg-gray-800/30',
};

/**
 * MissionBoard – Central Mode Selector for DePIN data-gathering activities.
 * Dark, cyberpunk, tactical theme. Pass setActiveMode(mode) and setTab(tab) so App can show Map vs Rig.
 */
function MissionBoard({ setActiveMode, setTab }) {
  const handleSelect = (task) => {
    if (task.disabled) return;
    setActiveMode(task.id);
    if (task.id === 'PASSIVE') setTab('TERMINAL');
    if (task.id === 'CARTOGRAPHER') setTab('MAP');
  };

  return (
    <div className="flex flex-col h-full w-full bg-black text-white overflow-y-auto pb-24 font-mono">
      <div className="p-6 pt-6">
        <div className="mb-6">
          <h1 className="text-lg font-black tracking-[0.2em] uppercase text-cyan-400 border-b border-cyan-500/30 pb-2 inline-block">
            Mission Board
          </h1>
          <p className="text-[10px] text-gray-500 tracking-widest mt-2 uppercase">
            Select DePIN data-gathering activity
          </p>
        </div>

        <ul className="space-y-4">
          {TASKS.map((task) => {
            const Icon = task.Icon;
            const isDisabled = task.disabled;
            const borderGlow = accentStyles[task.accent];
            const bgGlow = accentGlow[task.accent];

            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(task)}
                  disabled={isDisabled}
                  className={`w-full text-left rounded-lg border p-4 transition-all duration-300 ${bgGlow} ${
                    isDisabled
                      ? 'opacity-60 cursor-not-allowed border-gray-700'
                      : `border ${borderGlow} hover:shadow-[0_0_24px_rgba(34,211,238,0.25)] active:scale-[0.99]`
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center border ${
                        isDisabled ? 'border-gray-700 bg-gray-900/50' : `border-current ${borderGlow}`
                      }`}
                    >
                      <Icon size={24} className={isDisabled ? 'text-gray-600' : ''} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h2 className="text-sm font-bold tracking-wider uppercase text-white">
                          {task.title}
                        </h2>
                        <span
                          className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded ${
                            task.status === 'ACTIVE'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                              : task.status === 'AVAILABLE'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-gray-800 text-gray-500 border border-gray-700'
                          }`}
                        >
                          {task.statusLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                        {task.description}
                      </p>
                      <p className="text-[10px] text-cyan-400/90 mt-2 font-bold tracking-wider">
                        Reward: {task.reward}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default MissionBoard;
