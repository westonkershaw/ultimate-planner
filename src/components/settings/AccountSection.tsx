import { motion } from 'framer-motion';
import { Droplet, Utensils, User } from 'lucide-react';
import { useLegacyDataStore } from '@/store';

interface DailyTargets {
  waterGoal?: number;
  calorieGoal?: number;
  userName?: string;
  firstName?: string;
}

function NumberRow({
  Icon, label, value, min, max, step = 1, onChange,
}: {
  Icon: React.FC<{ size?: number; className?: string }>;
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon size={16} className="text-indigo-400 flex-shrink-0" />
      <span className="flex-1 text-sm text-slate-400">{label}</span>
      <input
        type="number"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))}
        className="w-20 text-center bg-slate-900/60 border border-slate-800/60 rounded-lg text-slate-100 text-sm px-2 py-1.5 outline-none focus:border-indigo-500/40 transition-colors"
      />
    </div>
  );
}

export default function AccountSection() {
  const data = useLegacyDataStore((s) => s.data) as DailyTargets;
  const onChange = useLegacyDataStore((s) => s.onChange);

  const updateField = (field: keyof DailyTargets, value: unknown) => {
    onChange((prev) => ({ ...prev, [field]: value }));
  };

  const displayName = data.userName || data.firstName || 'You';

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      aria-labelledby="account-heading"
    >
      <div className="flex items-center gap-2">
        <User size={14} className="text-slate-500" />
        <h2 id="account-heading" className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Account · {displayName}
        </h2>
      </div>

      <div className="p-4 rounded-xl border border-slate-800/40 bg-slate-900/30 divide-y divide-slate-800/40">
        <NumberRow
          Icon={Droplet}
          label="Daily water goal (glasses)"
          value={data.waterGoal ?? 8}
          min={4}
          max={20}
          onChange={(v) => updateField('waterGoal', v)}
        />
        <NumberRow
          Icon={Utensils}
          label="Daily calorie goal"
          value={data.calorieGoal ?? 2000}
          min={1000}
          max={5000}
          step={50}
          onChange={(v) => updateField('calorieGoal', v)}
        />
      </div>
    </motion.section>
  );
}
