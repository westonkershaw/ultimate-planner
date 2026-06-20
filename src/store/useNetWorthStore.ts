import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { NetWorthAsset, NetWorthLiability, NetWorthSnapshot, ID } from '@/types';

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

function upsertSnapshot(
  snapshots: NetWorthSnapshot[],
  netWorth: number,
  assets: number,
  liabilities: number,
): NetWorthSnapshot[] {
  const today = todayKey();
  const snap: NetWorthSnapshot = { date: today, netWorth, assets, liabilities };
  const without = snapshots.filter((s) => s.date !== today);
  return [...without, snap].sort((a, b) => (a.date < b.date ? -1 : 1));
}

function sumAssets(items: NetWorthAsset[]): number {
  return items.reduce((s, a) => s + (Number(a.value) || 0), 0);
}

function sumLiabilities(items: NetWorthLiability[]): number {
  return items.reduce((s, l) => s + (Number(l.balance) || 0), 0);
}

// ── Legacy migration ──────────────────────────────────────────────────────

interface LegacyAsset { id?: string; name?: string; value?: number; category?: string; notes?: string }
interface LegacyLiab { id?: string; name?: string; balance?: number; category?: string; notes?: string }

function readLegacyNetWorth(): { assets: NetWorthAsset[]; liabilities: NetWorthLiability[]; snapshots: NetWorthSnapshot[] } {
  const empty = { assets: [], liabilities: [], snapshots: [] };
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return empty;
    const blob = JSON.parse(blobRaw) as {
      netWorthAssets?: LegacyAsset[];
      netWorthLiabilities?: LegacyLiab[];
      netWorthSnapshots?: NetWorthSnapshot[];
    };
    const assets: NetWorthAsset[] = Array.isArray(blob.netWorthAssets)
      ? blob.netWorthAssets
          .filter((a): a is LegacyAsset & { name: string } => typeof a.name === 'string')
          .map((a) => ({
            id: a.id ?? uid(),
            name: a.name,
            value: Number(a.value) || 0,
            category: a.category,
            notes: a.notes,
          }))
      : [];
    const liabilities: NetWorthLiability[] = Array.isArray(blob.netWorthLiabilities)
      ? blob.netWorthLiabilities
          .filter((l): l is LegacyLiab & { name: string } => typeof l.name === 'string')
          .map((l) => ({
            id: l.id ?? uid(),
            name: l.name,
            balance: Number(l.balance) || 0,
            category: l.category,
            notes: l.notes,
          }))
      : [];
    const snapshots = Array.isArray(blob.netWorthSnapshots) ? blob.netWorthSnapshots : [];
    return { assets, liabilities, snapshots };
  } catch {
    return empty;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface NetWorthState {
  assets: NetWorthAsset[];
  liabilities: NetWorthLiability[];
  snapshots: NetWorthSnapshot[];
  migrated: boolean;
  ownedBy: string;
}

interface NetWorthActions {
  addAsset: (input: Omit<NetWorthAsset, 'id'>) => void;
  updateAsset: (id: ID, patch: Partial<Omit<NetWorthAsset, 'id'>>) => void;
  deleteAsset: (id: ID) => void;
  addLiability: (input: Omit<NetWorthLiability, 'id'>) => void;
  updateLiability: (id: ID, patch: Partial<Omit<NetWorthLiability, 'id'>>) => void;
  deleteLiability: (id: ID) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type NetWorthStore = NetWorthState & NetWorthActions;

function snapshotAfter(state: NetWorthState): NetWorthSnapshot[] {
  const a = sumAssets(state.assets);
  const l = sumLiabilities(state.liabilities);
  return upsertSnapshot(state.snapshots, a - l, a, l);
}

export const useNetWorthStore = create<NetWorthStore>()(
  persist(
    (set, get) => ({
      assets: [],
      liabilities: [],
      snapshots: [],
      migrated: false,
      ownedBy: 'guest',

      addAsset: (input) => {
        const next: NetWorthState = {
          ...get(),
          assets: [...get().assets, { ...input, id: uid(), value: Number(input.value) || 0 }],
        };
        set({ assets: next.assets, snapshots: snapshotAfter(next) });
      },

      updateAsset: (id, patch) => {
        const next: NetWorthState = {
          ...get(),
          assets: get().assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        };
        set({ assets: next.assets, snapshots: snapshotAfter(next) });
      },

      deleteAsset: (id) => {
        const next: NetWorthState = { ...get(), assets: get().assets.filter((a) => a.id !== id) };
        set({ assets: next.assets, snapshots: snapshotAfter(next) });
      },

      addLiability: (input) => {
        const next: NetWorthState = {
          ...get(),
          liabilities: [...get().liabilities, { ...input, id: uid(), balance: Number(input.balance) || 0 }],
        };
        set({ liabilities: next.liabilities, snapshots: snapshotAfter(next) });
      },

      updateLiability: (id, patch) => {
        const next: NetWorthState = {
          ...get(),
          liabilities: get().liabilities.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        };
        set({ liabilities: next.liabilities, snapshots: snapshotAfter(next) });
      },

      deleteLiability: (id) => {
        const next: NetWorthState = { ...get(), liabilities: get().liabilities.filter((l) => l.id !== id) };
        set({ liabilities: next.liabilities, snapshots: snapshotAfter(next) });
      },

      migrateFromLegacy: () => {
        const { assets, liabilities, snapshots } = readLegacyNetWorth();
        if (assets.length === 0 && liabilities.length === 0 && snapshots.length === 0) {
          set({ migrated: true });
          return;
        }
        const haveAssetIds = new Set(get().assets.map((a) => a.id));
        const haveLiabIds = new Set(get().liabilities.map((l) => l.id));
        const haveSnapDates = new Set(get().snapshots.map((s) => s.date));
        set({
          assets: [...get().assets, ...assets.filter((a) => !haveAssetIds.has(a.id))],
          liabilities: [...get().liabilities, ...liabilities.filter((l) => !haveLiabIds.has(l.id))],
          snapshots: [...get().snapshots, ...snapshots.filter((s) => !haveSnapDates.has(s.date))]
            .sort((a, b) => (a.date < b.date ? -1 : 1)),
          migrated: true,
        });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ assets: [], liabilities: [], snapshots: [], migrated: false, ownedBy: userId });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_networth_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        assets: s.assets,
        liabilities: s.liabilities,
        snapshots: s.snapshots,
        migrated: s.migrated,
        ownedBy: s.ownedBy,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────

export function calcNetWorth(assets: NetWorthAsset[], liabilities: NetWorthLiability[]): number {
  return sumAssets(assets) - sumLiabilities(liabilities);
}

export { sumAssets, sumLiabilities };
