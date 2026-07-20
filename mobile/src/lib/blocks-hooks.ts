/**
 * blocks-hooks.ts — react-query hooks wrapping blocks-repo. Mutations
 * invalidate the query keys that could be stale after they run; repo errors
 * are surfaced by throwing inside mutationFn so callers can read
 * `mutation.error`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completeBlock,
  createBlock,
  deleteBlock,
  listBlocksForRange,
  uncompleteBlock,
  updateBlock,
  type CreateBlockInput,
  type UpdateBlockPatch,
} from './blocks-repo';

export const blocksQueryKey = (fromDayKey: string, toDayKey: string) =>
  ['blocks', fromDayKey, toDayKey] as const;

/** Base key shared by every range variant — used for broad invalidation after a mutation. */
const blocksBaseKey = ['blocks'] as const;

export function useBlocksForRange(fromDayKey: string, toDayKey: string) {
  return useQuery({
    queryKey: blocksQueryKey(fromDayKey, toDayKey),
    queryFn: async () => {
      const { data, error } = await listBlocksForRange(fromDayKey, toDayKey);
      if (error) throw new Error(error);
      return data ?? [];
    },
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBlockInput) => {
      const { data, error } = await createBlock(input);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blocksBaseKey });
    },
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateBlockPatch }) => {
      const { data, error } = await updateBlock(id, patch);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blocksBaseKey });
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteBlock(id);
      if (error) throw new Error(error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blocksBaseKey });
    },
  });
}

export function useCompleteBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, goalId }: { id: string; goalId: string | null }) => {
      const { data, error } = await completeBlock(id, goalId);
      // completeBlock can return a populated `data` alongside a warning-style
      // `error` (block completed, goal progress failed to log) — only throw
      // when the block itself never completed (data is null).
      if (error && !data) throw new Error(error);
      if (error) {
        // Surface the partial-failure warning without discarding the result.
        return { block: data!, warning: error };
      }
      return { block: data!, warning: null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blocksBaseKey });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['recent-events'] });
    },
  });
}

export function useUncompleteBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await uncompleteBlock(id);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blocksBaseKey });
    },
  });
}
