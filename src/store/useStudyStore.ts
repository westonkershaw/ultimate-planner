import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Flashcard, FlashcardDeck, StudySession, ID } from '@/types';

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function todayKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

// ── Legacy migration ──────────────────────────────────────────────────────

interface LegacyCard { id?: string; front?: string; back?: string; reviews?: number; lastGrade?: number }
interface LegacyDeck {
  id?: string; name?: string; emoji?: string; color?: string; description?: string;
  cards?: LegacyCard[]; createdAt?: string; totalReviews?: number; lastStudied?: string | null;
}
interface LegacySession { id?: string; deckId?: string; date?: string; cardsReviewed?: number; duration?: number }

function clampGrade(n: number): Flashcard['lastGrade'] {
  return Math.max(0, Math.min(5, Math.round(n))) as Flashcard['lastGrade'];
}

function readLegacyStudy(): { decks: FlashcardDeck[]; sessions: StudySession[] } {
  const empty = { decks: [], sessions: [] };
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return empty;
    const blob = JSON.parse(blobRaw) as { flashcardDecks?: LegacyDeck[]; studySessions?: LegacySession[] };

    const decks: FlashcardDeck[] = Array.isArray(blob.flashcardDecks)
      ? blob.flashcardDecks
          .filter((d): d is LegacyDeck & { name: string } => typeof d.name === 'string')
          .map((d) => ({
            id: d.id ?? uid(),
            name: d.name,
            emoji: d.emoji ?? '📚',
            color: d.color ?? '#6366f1',
            description: d.description,
            cards: Array.isArray(d.cards)
              ? d.cards
                  .filter((c): c is LegacyCard & { front: string; back: string } =>
                    typeof c.front === 'string' && typeof c.back === 'string')
                  .map((c) => ({
                    id: c.id ?? uid(),
                    front: c.front,
                    back: c.back,
                    reviews: Number(c.reviews) || 0,
                    lastGrade: clampGrade(c.lastGrade ?? 0),
                  }))
              : [],
            createdAt: d.createdAt ?? new Date().toISOString(),
            totalReviews: Number(d.totalReviews) || 0,
            lastStudied: d.lastStudied ?? null,
          }))
      : [];

    const sessions: StudySession[] = Array.isArray(blob.studySessions)
      ? blob.studySessions
          .filter((s): s is LegacySession & { deckId: string; date: string } =>
            typeof s.deckId === 'string' && typeof s.date === 'string')
          .map((s) => ({
            id: s.id ?? uid(),
            deckId: s.deckId,
            date: s.date,
            cardsReviewed: Number(s.cardsReviewed) || 0,
            duration: Number(s.duration) || 0,
          }))
      : [];

    return { decks, sessions };
  } catch {
    return empty;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface StudyState {
  decks: FlashcardDeck[];
  sessions: StudySession[];
  migrated: boolean;
  ownedBy: string;
}

interface StudyActions {
  addDeck: (input: { name: string; emoji?: string; color?: string; description?: string }) => string;
  updateDeck: (id: ID, patch: Partial<Omit<FlashcardDeck, 'id' | 'cards'>>) => void;
  deleteDeck: (id: ID) => void;
  addCard: (deckId: ID, input: { front: string; back: string }) => void;
  updateCard: (deckId: ID, cardId: ID, patch: Partial<Omit<Flashcard, 'id'>>) => void;
  deleteCard: (deckId: ID, cardId: ID) => void;
  /** Record a study session and bump the deck's totals. */
  recordSession: (deckId: ID, cardsReviewed: number, durationSec: number) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type StudyStore = StudyState & StudyActions;

export const useStudyStore = create<StudyStore>()(
  persist(
    (set, get) => ({
      decks: [],
      sessions: [],
      migrated: false,
      ownedBy: 'guest',

      addDeck: (input) => {
        const id = uid();
        const deck: FlashcardDeck = {
          id,
          name: input.name.trim() || 'New Deck',
          emoji: input.emoji ?? '📚',
          color: input.color ?? '#6366f1',
          description: input.description,
          cards: [],
          createdAt: new Date().toISOString(),
          totalReviews: 0,
          lastStudied: null,
        };
        set({ decks: [...get().decks, deck] });
        return id;
      },

      updateDeck: (id, patch) => {
        set({ decks: get().decks.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
      },

      deleteDeck: (id) => {
        set({
          decks: get().decks.filter((d) => d.id !== id),
          sessions: get().sessions.filter((s) => s.deckId !== id),
        });
      },

      addCard: (deckId, input) => {
        const card: Flashcard = {
          id: uid(),
          front: input.front.trim(),
          back: input.back.trim(),
          reviews: 0,
          lastGrade: 0,
        };
        set({
          decks: get().decks.map((d) =>
            d.id === deckId ? { ...d, cards: [...d.cards, card] } : d,
          ),
        });
      },

      updateCard: (deckId, cardId, patch) => {
        set({
          decks: get().decks.map((d) =>
            d.id !== deckId
              ? d
              : { ...d, cards: d.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) },
          ),
        });
      },

      deleteCard: (deckId, cardId) => {
        set({
          decks: get().decks.map((d) =>
            d.id !== deckId ? d : { ...d, cards: d.cards.filter((c) => c.id !== cardId) },
          ),
        });
      },

      recordSession: (deckId, cardsReviewed, durationSec) => {
        const today = todayKey();
        const session: StudySession = {
          id: uid(),
          deckId,
          date: today,
          cardsReviewed,
          duration: durationSec,
        };
        set({
          sessions: [...get().sessions, session],
          decks: get().decks.map((d) =>
            d.id !== deckId ? d : { ...d, totalReviews: d.totalReviews + cardsReviewed, lastStudied: today },
          ),
        });
      },

      migrateFromLegacy: () => {
        const { decks, sessions } = readLegacyStudy();
        if (decks.length === 0 && sessions.length === 0) { set({ migrated: true }); return; }
        const haveDecks = new Set(get().decks.map((d) => d.id));
        const haveSessions = new Set(get().sessions.map((s) => s.id));
        set({
          decks: [...get().decks, ...decks.filter((d) => !haveDecks.has(d.id))],
          sessions: [...get().sessions, ...sessions.filter((s) => !haveSessions.has(s.id))],
          migrated: true,
        });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ decks: [], sessions: [], migrated: false, ownedBy: userId });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_study_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ decks: s.decks, sessions: s.sessions, migrated: s.migrated, ownedBy: s.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────

export function calcStudyStreak(sessions: StudySession[]): number {
  const dates = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = d.toLocaleDateString('en-CA');
    if (!dates.has(key)) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
    if (streak > 3650) break;
  }
  return streak;
}
