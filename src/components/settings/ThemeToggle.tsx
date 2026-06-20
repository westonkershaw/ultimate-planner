import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/store/useThemeStore';

const THEME_OPTIONS = [
  { id: 'dark' as const, label: 'Dark', Icon: Moon },
  { id: 'light' as const, label: 'Light', Icon: Sun },
  { id: 'system' as const, label: 'System', Icon: Monitor },
] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">Theme</label>
      <div className="flex gap-2">
        {THEME_OPTIONS.map(({ id, label, Icon }) => (
          <motion.button
            key={id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTheme(id)}
            className={[
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all',
              theme === id
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-900/30 border-slate-800/40 text-slate-500 hover:text-slate-300 hover:border-slate-700',
            ].join(' ')}
          >
            <Icon size={15} />
            <span>{label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
