import { useMutation, useQuery } from '@tanstack/react-query'

import {
  createRecurring,
  listRecurring,
  patchRecurring,
  type RecurringCreate,
  type RecurringFilters,
  type RecurringPatch,
} from '@/api/recurring'
import { queryClient } from '@/api/query'

export function useRecurring(filters: RecurringFilters = {}) {
  return useQuery({
    queryKey: ['recurring', filters],
    queryFn: () => listRecurring(filters),
  })
}

export function useCreateRecurring() {
  return useMutation({
    mutationFn: (body: RecurringCreate) => createRecurring(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recurring'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
  })
}

type PatchVars = {
  ref: string
  body: RecurringPatch
}

export function usePatchRecurring() {
  return useMutation({
    mutationFn: ({ ref, body }: PatchVars) => patchRecurring(ref, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recurring'] })
    },
  })
}
