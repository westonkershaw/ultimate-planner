import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VisionBoard, VisionCard, VisionCardType, ID } from '@/types';

const uid = (): ID =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 12)
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ── Legacy migration ──────────────────────────────────────────────────────
//
// Legacy schema has positioned cards with x/y/width/fontSize/etc. for a
// drag-and-drop canvas. The new view shows cards as a simple list, so we
// drop the positioning fields on migration — content + type + color is all
// the new view consumes.

interface LegacyCard {
  type?: string;
  content?: string;
  color?: string;
  title?: string;
}
interface LegacyBoard {
  id?: string;
  name?: string;
  title?: string;
  color?: string;
  cards?: LegacyCard[];
}

const CARD_TYPES: VisionCardType[] = ['goal', 'quote', 'affirmation', 'note'];

function readLegacyVision(): VisionBoard[] {
  try {
    const authRaw = localStorage.getItem('up_auth_v4');
    const auth = authRaw ? (JSON.parse(authRaw) as { id?: string }) : null;
    const userId = auth?.id ?? 'guest';
    const blobRaw = localStorage.getItem(`up_data_v4_${userId}`);
    if (!blobRaw) return [];
    const blob = JSON.parse(blobRaw) as { visionBoards?: LegacyBoard[] };
    if (!Array.isArray(blob.visionBoards)) return [];
    return blob.visionBoards
      .filter((b): b is LegacyBoard => !!(b.name ?? b.title))
      .map((b) => ({
        id: b.id ?? uid(),
        name: b.name ?? b.title ?? 'Vision Board',
        color: b.color ?? '#6366f1',
        cards: Array.isArray(b.cards)
          ? b.cards
              .filter((c): c is LegacyCard & { content: string } => typeof c.content === 'string' && c.content.length > 0)
              .map((c) => ({
                id: uid(),
                type: (CARD_TYPES.includes(c.type as VisionCardType) ? c.type : 'note') as VisionCardType,
                content: c.content,
                color: c.color,
              }))
          : [],
        createdAt: Date.now(),
      }));
  } catch {
    return [];
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

interface VisionState {
  boards: VisionBoard[];
  migrated: boolean;
  ownedBy: string;
}

interface VisionActions {
  addBoard: (input: { name: string; color?: string }) => string;
  renameBoard: (id: ID, name: string) => void;
  setBoardColor: (id: ID, color: string) => void;
  deleteBoard: (id: ID) => void;
  addCard: (boardId: ID, input: { type?: VisionCardType; content: string; color?: string }) => void;
  updateCard: (boardId: ID, cardId: ID, patch: Partial<Omit<VisionCard, 'id'>>) => void;
  deleteCard: (boardId: ID, cardId: ID) => void;
  migrateFromLegacy: () => void;
  resetForUser: (userId: string) => void;
}

export type VisionStore = VisionState & VisionActions;

export const useVisionStore = create<VisionStore>()(
  persist(
    (set, get) => ({
      boards: [],
      migrated: false,
      ownedBy: 'guest',

      addBoard: (input) => {
        const id = uid();
        const board: VisionBoard = {
          id,
          name: input.name.trim() || 'Untitled board',
          color: input.color ?? '#6366f1',
          cards: [],
          createdAt: Date.now(),
        };
        set({ boards: [...get().boards, board] });
        return id;
      },

      renameBoard: (id, name) => {
        set({ boards: get().boards.map((b) => (b.id === id ? { ...b, name } : b)) });
      },

      setBoardColor: (id, color) => {
        set({ boards: get().boards.map((b) => (b.id === id ? { ...b, color } : b)) });
      },

      deleteBoard: (id) => {
        set({ boards: get().boards.filter((b) => b.id !== id) });
      },

      addCard: (boardId, input) => {
        const card: VisionCard = {
          id: uid(),
          type: input.type ?? 'note',
          content: input.content.trim(),
          color: input.color,
        };
        set({
          boards: get().boards.map((b) =>
            b.id === boardId ? { ...b, cards: [...b.cards, card] } : b,
          ),
        });
      },

      updateCard: (boardId, cardId, patch) => {
        set({
          boards: get().boards.map((b) =>
            b.id !== boardId
              ? b
              : { ...b, cards: b.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) },
          ),
        });
      },

      deleteCard: (boardId, cardId) => {
        set({
          boards: get().boards.map((b) =>
            b.id !== boardId ? b : { ...b, cards: b.cards.filter((c) => c.id !== cardId) },
          ),
        });
      },

      migrateFromLegacy: () => {
        const legacy = readLegacyVision();
        if (legacy.length === 0) { set({ migrated: true }); return; }
        const have = new Set(get().boards.map((b) => b.id));
        const fresh = legacy.filter((b) => !have.has(b.id));
        set({ boards: [...get().boards, ...fresh], migrated: true });
      },

      resetForUser: (userId) => {
        if (get().ownedBy === userId) return;
        set({ boards: [], migrated: false, ownedBy: userId });
        get().migrateFromLegacy();
      },
    }),
    {
      name: 'up_vision_v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ boards: s.boards, migrated: s.migrated, ownedBy: s.ownedBy }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.migrated) state.migrateFromLegacy();
      },
    },
  ),
);
