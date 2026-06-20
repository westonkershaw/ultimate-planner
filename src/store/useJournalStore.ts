import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { JournalEntry, JournalRating, ID } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function todayKey(): string {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD (local)
}

// ── Legacy migration ───────────────────────────────────────────────────────
//
// On first hydration, copy `data.journals` from the legacy localStorage blob
// into the store. One-way: the legacy blob stays intact so the monolith and
// other adapter-hosted tabs keep working.

interface LegacyJournalShape {
  id?: string;
  date?: string;
  text?: string;
  rating?: number;
  mood?: string;
  prompt?: string;
  gratitude?: string;
  tags?: string[];
  photos?: string[];
  aiInsight?: string;
}

function readLegacyJournals(): JournalEntry[] {
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return [];
    const blob = JSON.parse(blobRaw) as { journals?: LegacyJournalShape[] };
    if (!Array.isArray(blob.journals)) return [];
    return blob.journals
      .filter((e): e is LegacyJournalShape & { date: string; text: string } => !!e.date && typeof e.text === 'string')
      .map((e) => ({
        id: e.id ?? uid(),
        date: e.date,
        text: e.text,
        rating: clampRating(e.rating ?? 0),
        mood: e.mood,
        prompt: e.prompt,
        gratitude: e.gratitude,
        tags: Array.isArray(e.tags) ? e.tags : [],
        photos: Array.isArray(e.photos) ? e.photos : [],
        aiInsight: e.aiInsight,
        updatedAt: Date.now(),
      }));
  } catch {
    return [];
  }
}

function clampRating(n: number): JournalRating {
  const r = Math.max(0, Math.min(5, Math.round(n)));
  return r as JournalRating;
}

// ── Store ──────────────────────────────────────────────────────────────────

interface JournalState {
  entries: JournalEntry[];
  /** True once legacy migration has run for this storage key. */
  migrated: boolean;
  /** The userId this entries blob belongs to. Reset triggers when this changes. */
  ownedBy: string;
}

interface JournalActions {
  upsertToday: (patch: Partial<Omit<JournalEntry, 'id' | 'date' | 'updatedAt'>>) => void;
  upsertEntry: (entry: Omit<JournalEntry, 'id' | 'updatedAt'> & { id?: string }) => void;
  deleteEntry: (id: ID) => void;
  /** Re-run legacy migration (e.g. after auth change). */
  migrateFromLegacy: () => void;
  /** Wipe in-memory state + re-key to a new owner. Call when authUser.id changes. */
  resetForUser: (userId: string) => void;
}

export type JournalStore = JournalState & JournalActions;

export const useJournalStore = create<JournalStore>()(
  persist(
    (set, get) => ({
      entries: [],
      migrated: false,
      ownedBy: 'guest',

      upsertToday: (patch) => {
        const today = todayKey();
        const existing = get().entries.find((e) => e.date === today);
        const merged: JournalEntry = {
          id: existing?.id ?? uid(),
          date: today,
          text: patch.text ?? existing?.text ?? '',
          rating: clampRating((patch.rating ?? existing?.rating ?? 0) as number),
          mood: patch.mood ?? existing?.mood,
          prompt: patch.prompt ?? existing?.prompt,
          gratitude: patch.gratitude ?? existing?.gratitude,
          tags: patch.tags ?? existing?.tags ?? [],
          photos: patch.photos ?? existing?.photos ?? [],
          aiInsight: existing?.aiInsight,
          updatedAt: Date.now(),
        };
        set({
          entries: [...get().entries.filter((e) => e.date !== today), merged]
            .sort((a, b) => (a.date < b.date ? 1 : -1)),
        });
      },

      upsertEntry: (entry) => {
        const id = entry.id ?? uid();
        const next: JournalEntry = { ...entry, id, updatedAt: Date.now(), rating: clampRating(entry.rating) };
        set({
          entries: [...get().entries.filter((e) => e.id !== id && e.date !== entry.date), next]
            .sort((a, b) => (a.date < b.date ? 1 : -1)),
        });
      },

      deleteEntry: (id) => {
        set({ entries: get().entries.filter((e) => e.id !== id) });
      },

      migrateFromLegacy: () => {
        const legacy = readLegacyJournals();
        if (legacy.length === 0) {
          set({ migrated: true });
          return;
        }
        const have = new Set(get().entries.map((e) => e.date));
        const fresh = legacy.filter((e) => !have.has(e.date));
        set({
          entries: [...get().entries, ...fresh].sort((a, b) => (a.date < b.date ? 1 : -1)),
          migrated: true,
        });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ entries: [], migrated: false, ownedBy: userId });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_journal_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ entries: state.entries, migrated: state.migrated, ownedBy: state.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);

// ── Selectors ──────────────────────────────────────────────────────────────

export function calcWritingStreak(entries: JournalEntry[]): number {
  const dates = new Set(entries.map((e) => e.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toLocaleDateString('en-CA');
    if (!dates.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function calcLifetimeWords(entries: JournalEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.text.trim().split(/\s+/).filter(Boolean).length), 0);
}
