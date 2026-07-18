/**
 * goals-hooks.ts — react-query hooks wrapping goals-repo. Mutations invalidate
 * the query keys that could be stale after they run; repo errors are surfaced
 * by throwing inside mutationFn so callers can read `mutation.error`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  archiveGoal,
  createGoal,
  deleteGoal,
  listEvents,
  listGoals,
  logProgress,
  updateGoal,
  type CreateGoalInput,
  type UpdateGoalPatch,
} from './goals-repo';

export const goalsQueryKey = ['goals'] as const;
export const goalEventsQueryKey = (goalId: string) => ['goal-events', goalId] as const;

export function useGoals() {
  return useQuery({
    queryKey: goalsQueryKey,
    queryFn: async () => {
      const { data, error } = await listGoals();
      if (error) throw new Error(error);
      return data ?? [];
    },
  });
}

export function useGoalEvents(goalId: string | undefined) {
  return useQuery({
    queryKey: goalEventsQueryKey(goalId ?? ''),
    queryFn: async () => {
      const { data, error } = await listEvents(goalId!);
      if (error) throw new Error(error);
      return data ?? [];
    },
    enabled: !!goalId,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      const { data, error } = await createGoal(input);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsQueryKey });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateGoalPatch }) => {
      const { data, error } = await updateGoal(id, patch);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsQueryKey });
    },
  });
}

export function useArchiveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await archiveGoal(id);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsQueryKey });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deleteGoal(id);
      if (error) throw new Error(error);
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: goalsQueryKey });
      queryClient.removeQueries({ queryKey: goalEventsQueryKey(id) });
    },
  });
}

export function useLogProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      goalId,
      amount,
      note,
    }: {
      goalId: string;
      amount: number;
      note?: string;
    }) => {
      const { data, error } = await logProgress(goalId, amount, note);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: goalEventsQueryKey(variables.goalId) });
      queryClient.invalidateQueries({ queryKey: goalsQueryKey });
    },
  });
}
