import { motion } from 'framer-motion';

interface EnergySelectorProps {
  value: number;
  onChange: (level: number) => void;
}

const ENERGY_LEVELS = [
  { level: 1, emoji: '😴', label: 'Exhausted' },
  { level: 2, emoji: '😐', label: 'Low' },
  { level: 3, emoji: '🙂', label: 'Normal' },
  { level: 4, emoji: '😊', label: 'Good' },
  { level: 5, emoji: '⚡', label: 'Peak' },
];

export default function EnergySelector({ value, onChange }: EnergySelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Energy Level</label>
      <div className="flex gap-2">
        {ENERGY_LEVELS.map(({ level, emoji, label }) => (
          <motion.button
            key={level}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(level)}
            className={[
              'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all flex-1',
              value === level
                ? 'bg-indigo-500/15 border-indigo-500/40 scale-105'
                : 'bg-slate-900/30 border-slate-800/40 hover:border-slate-700',
            ].join(' ')}
          >
            <span className="text-lg">{emoji}</span>
            <span className="text-[9px] text-slate-500">{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
