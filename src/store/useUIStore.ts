import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ActiveView, Toast, ToastType, ID } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────

const uid = (): ID => Math.random().toString(36).slice(2, 9);

// ── Modal registry ─────────────────────────────────────────────────────────

export type ModalId =
  | 'onboarding'
  | 'morningDashboard'
  | 'getStarted'
  | 'monthlyReview'
  | 'paywall'
  | 'bankConnect';

// ── State & Action Interfaces ──────────────────────────────────────────────

interface UIState {
  activeView: ActiveView;
  commandPaletteOpen: boolean;
  /** Max 5 concurrent toasts; oldest are evicted */
  toasts: Toast[];
  /** Currently displayed modal, if any. Only one modal at a time. */
  activeModal: ModalId | null;
}

interface UIActions {
  setActiveView: (view: ActiveView) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: ID) => void;
  openModal: (id: ModalId) => void;
  closeModal: () => void;
}

export type UIStore = UIState & UIActions;

// ── Store ──────────────────────────────────────────────────────────────────

/**
 * useUIStore
 *
 * Ephemeral UI state — not persisted to localStorage.
 * Manages active navigation view, command palette visibility, and toast queue.
 */
export const useUIStore = create<UIStore>()(
  immer((set) => ({
    activeView: 'dashboard',
    commandPaletteOpen: false,
    toasts: [],
    activeModal: null,

    setActiveView: (view) =>
      set((draft) => {
        draft.activeView = view;
      }),

    openCommandPalette: () =>
      set((draft) => {
        draft.commandPaletteOpen = true;
      }),

    closeCommandPalette: () =>
      set((draft) => {
        draft.commandPaletteOpen = false;
      }),

    toggleCommandPalette: () =>
      set((draft) => {
        draft.commandPaletteOpen = !draft.commandPaletteOpen;
      }),

    addToast: (message, type = 'info') =>
      set((draft) => {
        draft.toasts.push({ id: uid(), message, type, createdAt: Date.now() });
        if (draft.toasts.length > 5) {
          draft.toasts = draft.toasts.slice(-5);
        }
      }),

    removeToast: (id) =>
      set((draft) => {
        draft.toasts = draft.toasts.filter((t) => t.id !== id);
      }),

    openModal: (id) =>
      set((draft) => {
        draft.activeModal = id;
      }),

    closeModal: () =>
      set((draft) => {
        draft.activeModal = null;
      }),
  })),
);
