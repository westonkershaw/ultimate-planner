import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Book, ReadingGoal, ReadingStatus, ID } from '@/types';

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function todayStr(): string {
  return new Date().toLocaleDateString('en-CA');
}

function currentYear(): number {
  return new Date().getFullYear();
}

// ── Legacy migration ──────────────────────────────────────────────────────

interface LegacyBook {
  id?: string;
  title?: string;
  author?: string;
  cover?: string;
  emoji?: string;
  status?: string;
  progress?: number;
  totalPages?: number;
  currentPage?: number;
  rating?: number;
  notes?: string;
  aiSummary?: string;
  genre?: string;
  startDate?: string;
  finishDate?: string;
  addedAt?: string;
}

function readLegacyReading(): { books: Book[]; goal: ReadingGoal | null } {
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return { books: [], goal: null };
    const blob = JSON.parse(blobRaw) as { readingList?: LegacyBook[]; readingGoal?: ReadingGoal };
    const books: Book[] = Array.isArray(blob.readingList)
      ? blob.readingList
          .filter((b): b is LegacyBook & { title: string } => typeof b.title === 'string')
          .map((b) => ({
            id: b.id ?? uid(),
            title: b.title,
            author: b.author,
            cover: b.cover,
            emoji: b.emoji ?? '📚',
            status: (['want', 'reading', 'done'].includes(b.status ?? '') ? b.status : 'want') as ReadingStatus,
            progress: Math.max(0, Math.min(100, b.progress ?? 0)),
            totalPages: b.totalPages,
            currentPage: b.currentPage,
            rating: Math.max(0, Math.min(5, b.rating ?? 0)),
            notes: b.notes,
            aiSummary: b.aiSummary,
            genre: b.genre,
            startDate: b.startDate,
            finishDate: b.finishDate,
            addedAt: b.addedAt ?? todayStr(),
          }))
      : [];
    const goal = blob.readingGoal && typeof blob.readingGoal.target === 'number'
      ? blob.readingGoal
      : null;
    return { books, goal };
  } catch {
    return { books: [], goal: null };
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface ReadingState {
  books: Book[];
  goal: ReadingGoal;
  migrated: boolean;
  ownedBy: string;
}

interface ReadingActions {
  addBook: (input: { title: string; author?: string; status?: ReadingStatus; totalPages?: number; emoji?: string }) => void;
  updateBook: (id: ID, patch: Partial<Omit<Book, 'id'>>) => void;
  deleteBook: (id: ID) => void;
  setStatus: (id: ID, status: ReadingStatus) => void;
  setGoal: (target: number) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type ReadingStore = ReadingState & ReadingActions;

export const useReadingStore = create<ReadingStore>()(
  persist(
    (set, get) => ({
      books: [],
      goal: { year: currentYear(), target: 12 },
      migrated: false,
      ownedBy: 'guest',

      addBook: (input) => {
        const book: Book = {
          id: uid(),
          title: input.title.trim(),
          author: input.author?.trim(),
          emoji: input.emoji ?? '📚',
          status: input.status ?? 'want',
          progress: 0,
          totalPages: input.totalPages,
          currentPage: 0,
          rating: 0,
          addedAt: todayStr(),
        };
        set({ books: [...get().books, book] });
      },

      updateBook: (id, patch) => {
        set({ books: get().books.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
      },

      deleteBook: (id) => {
        set({ books: get().books.filter((b) => b.id !== id) });
      },

      setStatus: (id, status) => {
        set({
          books: get().books.map((b) => {
            if (b.id !== id) return b;
            const next: Book = { ...b, status };
            if (status === 'reading' && !b.startDate) next.startDate = todayStr();
            if (status === 'done') {
              next.finishDate = todayStr();
              next.progress = 100;
            }
            return next;
          }),
        });
      },

      setGoal: (target) => {
        set({ goal: { year: currentYear(), target: Math.max(1, target) } });
      },

      migrateFromLegacy: () => {
        const { books, goal } = readLegacyReading();
        if (books.length === 0 && !goal) { set({ migrated: true }); return; }
        const have = new Set(get().books.map((b) => b.id));
        const fresh = books.filter((b) => !have.has(b.id));
        set({
          books: [...get().books, ...fresh],
          goal: goal ?? get().goal,
          migrated: true,
        });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({
          books: [],
          goal: { year: currentYear(), target: 12 },
          migrated: false,
          ownedBy: userId,
        });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_reading_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ books: s.books, goal: s.goal, migrated: s.migrated, ownedBy: s.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);

// ── Selectors ─────────────────────────────────────────────────────────────

export function booksThisYear(books: Book[], year = currentYear()): Book[] {
  return books.filter((b) => b.status === 'done' && b.finishDate?.startsWith(String(year)));
}

export function goalProgressPct(books: Book[], goal: ReadingGoal): number {
  if (goal.target <= 0) return 0;
  const done = booksThisYear(books, goal.year).length;
  return Math.min(100, Math.round((done / goal.target) * 100));
}
