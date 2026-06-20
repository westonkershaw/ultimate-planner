import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Timestamp } from '@/types';

interface BackupState {
  lastBackup: Timestamp | null;
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly';
  googleConnected: boolean;
}

interface BackupActions {
  setAutoBackup: (enabled: boolean) => void;
  setFrequency: (freq: 'daily' | 'weekly') => void;
  setGoogleConnected: (connected: boolean) => void;
  recordBackup: () => void;
}

export type BackupStore = BackupState & BackupActions;

export const useBackupStore = create<BackupStore>()(
  persist(
    (set) => ({
      lastBackup: null,
      autoBackupEnabled: false,
      backupFrequency: 'weekly',
      googleConnected: false,

      setAutoBackup: (enabled) => set({ autoBackupEnabled: enabled }),
      setFrequency: (freq) => set({ backupFrequency: freq }),
      setGoogleConnected: (connected) => set({ googleConnected: connected }),
      recordBackup: () => set({ lastBackup: Date.now() }),
    }),
    { name: 'up_backup' },
  ),
);
