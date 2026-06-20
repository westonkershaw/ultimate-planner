const STORAGE_KEYS = [
  'up_tasks',
  'up_finance',
  'up_workouts',
  'up_planner',
  'up_captures',
  'up_focus_data',
  'up_theme',
  'up_backup',
] as const;

export interface BackupBlob {
  version: 1;
  createdAt: number;
  data: Record<string, string>;
}

export function exportAllData(): BackupBlob {
  const data: Record<string, string> = {};
  for (const key of STORAGE_KEYS) {
    const val = localStorage.getItem(key);
    if (val) data[key] = val;
  }
  return { version: 1, createdAt: Date.now(), data };
}

export function importAllData(blob: BackupBlob): { success: boolean; error?: string } {
  if (!blob || blob.version !== 1 || !blob.data) {
    return { success: false, error: 'Invalid backup format' };
  }

  try {
    for (const [key, value] of Object.entries(blob.data)) {
      if (STORAGE_KEYS.includes(key as typeof STORAGE_KEYS[number])) {
        localStorage.setItem(key, value);
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Failed to restore backup' };
  }
}

export function downloadBackup() {
  const blob = exportAllData();
  const json = JSON.stringify(blob, null, 2);
  const file = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ultimate-planner-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getBackupSize(): string {
  let total = 0;
  for (const key of STORAGE_KEYS) {
    const val = localStorage.getItem(key);
    if (val) total += val.length * 2; // UTF-16
  }
  if (total < 1024) return `${total} B`;
  if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
  return `${(total / (1024 * 1024)).toFixed(1)} MB`;
}

export function readBackupFile(file: File): Promise<BackupBlob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const blob = JSON.parse(e.target?.result as string) as BackupBlob;
        resolve(blob);
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
