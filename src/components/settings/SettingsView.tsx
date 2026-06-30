import { motion } from 'framer-motion';
import { Settings, Trash2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import BackupSettings from './BackupSettings';
import AccountSection from './AccountSection';
import NotificationsSection from './NotificationsSection';
import AISection from './AISection';
import SecuritySection from './SecuritySection';
import { useLegacyDataStore, useUIStore } from '@/store';

function DangerZone() {
  const onChange = useLegacyDataStore((s) => s.onChange);
  const addToast = useUIStore((s) => s.addToast);

  const wipe = () => {
    const ok = window.confirm('Delete ALL your data permanently? This cannot be undone.');
    if (!ok) return;
    onChange(() => ({}));
    addToast('All data deleted', 'warning');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      aria-labelledby="danger-heading"
    >
      <div className="flex items-center gap-2">
        <Trash2 size={14} className="text-rose-500/80" />
        <h2 id="danger-heading" className="text-xs font-medium text-rose-400/80 uppercase tracking-wider">Danger Zone</h2>
      </div>
      <button
        onClick={wipe}
        className="w-full py-2.5 rounded-xl border border-rose-500/25 bg-rose-500/[0.05] text-sm font-medium text-rose-300 hover:bg-rose-500/15 transition-colors"
      >
        Delete all planner data
      </button>
    </motion.section>
  );
}

export default function SettingsView() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-8 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <Settings size={18} className="text-accent-text" />
        <h1 className="font-syne text-lg font-bold text-fg">Settings</h1>
      </motion.div>

      <AccountSection />

      <div className="pt-2 border-t border-border">
        <ThemeToggle />
      </div>

      <div className="pt-2 border-t border-border">
        <NotificationsSection />
      </div>

      <div className="pt-2 border-t border-border">
        <AISection />
      </div>

      <div className="pt-2 border-t border-border">
        <BackupSettings />
      </div>

      <div className="pt-2 border-t border-border">
        <SecuritySection />
      </div>

      <div className="pt-2 border-t border-border">
        <DangerZone />
      </div>
    </div>
  );
}
