import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Trip, TripExpense, TripStatus, ID } from '@/types';

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function spentOn(trip: Trip): number {
  return trip.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

// ── Legacy migration ──────────────────────────────────────────────────────

interface LegacyTrip {
  id?: string;
  name?: string;
  destination?: string;
  emoji?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  spent?: number;
  currency?: string;
  coverColor?: string;
  notes?: string;
  status?: string;
  expenses?: Array<{ id?: string; date?: string; category?: string; description?: string; amount?: number }>;
}

function readLegacyTrips(): Trip[] {
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return [];
    const blob = JSON.parse(blobRaw) as { trips?: LegacyTrip[] };
    if (!Array.isArray(blob.trips)) return [];
    return blob.trips
      .filter((t): t is LegacyTrip & { name: string } => typeof t.name === 'string')
      .map((t) => ({
        id: t.id ?? uid(),
        name: t.name,
        destination: t.destination ?? '',
        emoji: t.emoji ?? '✈️',
        startDate: t.startDate,
        endDate: t.endDate,
        budget: Number(t.budget) || 0,
        currency: t.currency ?? 'USD',
        coverColor: t.coverColor,
        notes: t.notes,
        status: (['planning', 'active', 'done'].includes(t.status ?? '') ? t.status : 'planning') as TripStatus,
        expenses: Array.isArray(t.expenses)
          ? t.expenses
              .filter((e): e is { description: string; amount: number; date?: string; category?: string; id?: string } =>
                typeof e.description === 'string' && typeof e.amount === 'number')
              .map((e) => ({
                id: e.id ?? uid(),
                date: e.date ?? todayKey(),
                category: e.category,
                description: e.description,
                amount: Number(e.amount) || 0,
              }))
          : [],
      }));
  } catch {
    return [];
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface TravelState {
  trips: Trip[];
  migrated: boolean;
  ownedBy: string;
}

interface TravelActions {
  addTrip: (input: { name: string; destination?: string; startDate?: string; endDate?: string; budget?: number; emoji?: string; currency?: string }) => void;
  updateTrip: (id: ID, patch: Partial<Omit<Trip, 'id'>>) => void;
  deleteTrip: (id: ID) => void;
  setStatus: (id: ID, status: TripStatus) => void;
  addExpense: (tripId: ID, input: Omit<TripExpense, 'id'>) => void;
  deleteExpense: (tripId: ID, expenseId: ID) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type TravelStore = TravelState & TravelActions;

export const useTravelStore = create<TravelStore>()(
  persist(
    (set, get) => ({
      trips: [],
      migrated: false,
      ownedBy: 'guest',

      addTrip: (input) => {
        const trip: Trip = {
          id: uid(),
          name: input.name.trim(),
          destination: input.destination?.trim() ?? '',
          emoji: input.emoji ?? '✈️',
          startDate: input.startDate,
          endDate: input.endDate,
          budget: Number(input.budget) || 0,
          currency: input.currency ?? 'USD',
          status: 'planning',
          expenses: [],
        };
        set({ trips: [...get().trips, trip] });
      },

      updateTrip: (id, patch) => {
        set({ trips: get().trips.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
      },

      deleteTrip: (id) => {
        set({ trips: get().trips.filter((t) => t.id !== id) });
      },

      setStatus: (id, status) => {
        set({ trips: get().trips.map((t) => (t.id === id ? { ...t, status } : t)) });
      },

      addExpense: (tripId, input) => {
        const expense: TripExpense = { ...input, id: uid(), amount: Number(input.amount) || 0 };
        set({
          trips: get().trips.map((t) =>
            t.id === tripId ? { ...t, expenses: [...t.expenses, expense] } : t,
          ),
        });
      },

      deleteExpense: (tripId, expenseId) => {
        set({
          trips: get().trips.map((t) =>
            t.id === tripId ? { ...t, expenses: t.expenses.filter((e) => e.id !== expenseId) } : t,
          ),
        });
      },

      migrateFromLegacy: () => {
        const legacy = readLegacyTrips();
        if (legacy.length === 0) { set({ migrated: true }); return; }
        const have = new Set(get().trips.map((t) => t.id));
        const fresh = legacy.filter((t) => !have.has(t.id));
        set({ trips: [...get().trips, ...fresh], migrated: true });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ trips: [], migrated: false, ownedBy: userId });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_travel_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ trips: s.trips, migrated: s.migrated, ownedBy: s.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T12:00:00');
  if (isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
