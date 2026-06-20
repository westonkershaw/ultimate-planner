import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { ID } from '@/types';
import type { CaptureItem } from '@/types/capture.types';
import { parseCapture } from '@/utils/captureParser';
import { useTaskStore } from './useTaskStore';

const uid = (): ID => Math.random().toString(36).slice(2, 9);

interface CaptureState {
  items: CaptureItem[];
}

interface CaptureActions {
  addCapture: (rawText: string) => void;
  removeCapture: (id: ID) => void;
  archiveCapture: (id: ID) => void;
  convertToTask: (id: ID) => void;
  bulkConvert: (ids: ID[]) => void;
  clearArchived: () => void;
}

export type CaptureStore = CaptureState & CaptureActions;

export const useCaptureStore = create<CaptureStore>()(
  persist(
    immer((set, get) => ({
      items: [],

      addCapture: (rawText) =>
        set((draft) => {
          const parsed = parseCapture(rawText);
          draft.items.unshift({
            id: uid(),
            text: parsed.cleanText,
            rawText,
            capturedAt: Date.now(),
            priority: parsed.priority,
            dueDate: parsed.dueDate,
            tags: parsed.tags,
            duration: parsed.duration,
            archived: false,
            convertedToTask: false,
          });
        }),

      removeCapture: (id) =>
        set((draft) => {
          draft.items = draft.items.filter((i) => i.id !== id);
        }),

      archiveCapture: (id) =>
        set((draft) => {
          const item = draft.items.find((i) => i.id === id);
          if (item) item.archived = true;
        }),

      convertToTask: (id) => {
        const item = get().items.find((i) => i.id === id);
        if (!item || item.convertedToTask) return;

        useTaskStore.getState().addTask({
          title: item.text,
          description: '',
          priority: item.priority ?? 'medium',
          dueDate: item.dueDate ?? '',
          completed: false,
          tags: item.tags,
        });

        set((draft) => {
          const target = draft.items.find((i) => i.id === id);
          if (target) target.convertedToTask = true;
        });
      },

      bulkConvert: (ids) => {
        ids.forEach((id) => get().convertToTask(id));
      },

      clearArchived: () =>
        set((draft) => {
          draft.items = draft.items.filter((i) => !i.archived);
        }),
    })),
    { name: 'up_captures' },
  ),
);
