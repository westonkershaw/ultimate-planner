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
      <label className="text-xs font-medium text-fg-muted uppercase tracking-wider">Energy Level</label>
      <div className="flex gap-2">
        {ENERGY_LEVELS.map(({ level, emoji, label }) => (
          <motion.button
            key={level}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(level)}
            className={[
              'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all flex-1',
              value === level
                ? 'bg-accent/15 border-accent/40 scale-105'
                : 'bg-surface-1 border-border hover:border-border-strong',
            ].join(' ')}
          >
            <span className="text-lg">{emoji}</span>
            <span className="text-[9px] text-fg-muted">{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
