import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload, Cloud, Clock } from 'lucide-react';
import { useBackupStore } from '@/store/useBackupStore';
import { downloadBackup, readBackupFile, importAllData, getBackupSize } from '@/utils/backupEngine';
import { useUIStore } from '@/store';

export default function BackupSettings() {
  const { lastBackup, autoBackupEnabled, backupFrequency, googleConnected, setAutoBackup, setFrequency, recordBackup } = useBackupStore();
  const addToast = useUIStore((s) => s.addToast);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDownload = () => {
    downloadBackup();
    recordBackup();
    addToast('Backup downloaded', 'success');
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const blob = await readBackupFile(file);
      const result = importAllData(blob);
      if (result.success) {
        addToast('Backup restored! Refreshing...', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        addToast(result.error ?? 'Restore failed', 'error');
      }
    } catch {
      addToast('Invalid backup file', 'error');
    }
    e.target.value = '';
  };

  const lastBackupStr = lastBackup
    ? new Date(lastBackup).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Never';

  return (
    <div className="space-y-4">
      <label className="text-xs font-medium text-fg-muted uppercase tracking-wider">Backup & Restore</label>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-fg-muted">
        <span className="flex items-center gap-1"><Clock size={11} /> Last: {lastBackupStr}</span>
        <span>Size: {getBackupSize()}</span>
      </div>

      {/* Manual backup/restore */}
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-surface-1 text-sm text-fg-secondary hover:border-accent/30 transition-colors"
        >
          <Download size={14} /> Export
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => fileRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-surface-1 text-sm text-fg-secondary hover:border-accent/30 transition-colors"
        >
          <Upload size={14} /> Restore
        </motion.button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleRestore} className="hidden" />
      </div>

      {/* Google Drive */}
      <div className="p-3 rounded-xl border border-border bg-surface-1 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud size={15} className={googleConnected ? 'text-emerald-400' : 'text-fg-faint'} />
            <span className="text-sm text-fg-secondary">Google Drive</span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${googleConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-2 text-fg-muted'}`}>
            {googleConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <button className="w-full py-2 rounded-lg border border-border text-xs text-fg-muted hover:text-fg-secondary hover:border-accent/30 transition-colors">
          {googleConnected ? 'Disconnect' : 'Connect Google Drive'}
        </button>
      </div>

      {/* Auto backup */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-fg-muted">Auto-backup</span>
        <button
          onClick={() => setAutoBackup(!autoBackupEnabled)}
          className={`w-10 h-5 rounded-full transition-colors relative ${autoBackupEnabled ? 'bg-accent' : 'bg-surface-3'}`}
        >
          <motion.div
            animate={{ x: autoBackupEnabled ? 20 : 2 }}
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
          />
        </button>
      </div>

      {autoBackupEnabled && (
        <div className="flex gap-2">
          {(['daily', 'weekly'] as const).map((freq) => (
            <button
              key={freq}
              onClick={() => setFrequency(freq)}
              className={[
                'flex-1 py-2 rounded-lg border text-xs capitalize transition-colors',
                backupFrequency === freq
                  ? 'border-accent/40 bg-accent/10 text-accent-text'
                  : 'border-border text-fg-muted hover:text-fg-secondary',
              ].join(' ')}
            >
              {freq}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
