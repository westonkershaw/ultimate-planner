/**
 * people-hooks.ts — react-query hooks wrapping people-repo. Mutations
 * invalidate the ['people'] query key; repo errors are surfaced by throwing
 * inside mutationFn so callers can read `mutation.error`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createPerson,
  deletePerson,
  listPeople,
  logContact,
  setCategory,
  updatePerson,
  type CreatePersonInput,
  type UpdatePersonPatch,
} from './people-repo';
import type { Category } from './people-types';

export const peopleQueryKey = ['people'] as const;

export function usePeople() {
  return useQuery({
    queryKey: peopleQueryKey,
    queryFn: async () => {
      const { data, error } = await listPeople();
      if (error) throw new Error(error);
      return data ?? [];
    },
  });
}

export function useCreatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePersonInput) => {
      const { data, error } = await createPerson(input);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
  });
}

export function useUpdatePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdatePersonPatch }) => {
      const { data, error } = await updatePerson(id, patch);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
  });
}

export function useDeletePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await deletePerson(id);
      if (error) throw new Error(error);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
  });
}

export function useSetCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: Category }) => {
      const { data, error } = await setCategory(id, category);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
  });
}

export function useLogContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await logContact(id);
      if (error) throw new Error(error);
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
  });
}
