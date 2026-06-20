import { create } from 'zustand';

// ── Adapter bridge for legacy tabs ─────────────────────────────────────────
//
// Many Ultimate Planner tabs (Journal, Sleep, Mood, Reading, Habits, etc.)
// still use the monolith's `{ data, onChange }` prop interface. Until each
// tab is rewritten to read from dedicated Zustand stores, this adapter loads
// the same localStorage blob the monolith uses (`up_data_v4_<userId>`) so the
// new App.tsx shell can host them without data loss.

const STORE_KEY_PREFIX = 'up_data_v4';
const AUTH_KEY = 'up_user';

type LegacyData = Record<string, unknown>;

function readUserId(): string {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw || raw === 'null') return 'guest';
    const u = JSON.parse(raw) as { id?: string } | null;
    return u?.id ?? 'guest';
  } catch {
    return 'guest';
  }
}

function storageKey(): string {
  return `${STORE_KEY_PREFIX}_${readUserId()}`;
}

function loadLegacyData(): LegacyData {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LegacyData;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistLegacyData(d: LegacyData): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(d));
  } catch (e) {
    console.error('[useLegacyDataStore] localStorage write failed:', e);
  }
}

interface LegacyDataState {
  data: LegacyData;
}

interface LegacyDataActions {
  /** Legacy `onChange(updater)` form used by most tabs. */
  onChange: (updater: (prev: LegacyData) => LegacyData) => void;
  /** Alias for tabs that use `upd` (e.g. GoalsTabV2). */
  upd: (updater: (prev: LegacyData) => LegacyData) => void;
  /** Reload from localStorage — call after auth state changes. */
  reload: () => void;
}

export type LegacyDataStore = LegacyDataState & LegacyDataActions;

export const useLegacyDataStore = create<LegacyDataStore>()((set, get) => {
  const apply = (updater: (prev: LegacyData) => LegacyData) => {
    const next = updater(get().data);
    persistLegacyData(next);
    set({ data: next });
  };

  return {
    data: loadLegacyData(),
    onChange: apply,
    upd: apply,
    reload: () => set({ data: loadLegacyData() }),
  };
});

/** Hook returning `[data, onChange]` for legacy tabs. */
export function useLegacyData(): [LegacyData, (updater: (prev: LegacyData) => LegacyData) => void] {
  const data = useLegacyDataStore((s) => s.data);
  const onChange = useLegacyDataStore((s) => s.onChange);
  return [data, onChange];
}
