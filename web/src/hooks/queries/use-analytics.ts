import { useMutation, useQuery } from '@tanstack/react-query'

import { createCustomQuery, fetchOverview, patchCustomQuery, runCustomQuery } from '@/api/analytics'
import { queryClient } from '@/api/query'
import type { CustomQueryCreate, CustomQueryPatch, Paths } from '@/api/types'

type RunQuery = NonNullable<Paths['/api/analytics/custom/{ref}']['get']['parameters']['query']>

/** The one call the analytics screen makes: everything the brief draws arrives together. */
export function useOverview(from: string, to: string) {
  return useQuery({
    queryKey: ['analytics', 'overview', from, to],
    queryFn: () => fetchOverview(from, to),
  })
}

/** A saved view runs only once there is a ref to run: the empty string is a closed panel. */
export function useCustomRun(ref: string, query: RunQuery = {}) {
  return useQuery({
    queryKey: ['analytics', 'custom', ref, query],
    queryFn: () => runCustomQuery(ref, query),
    enabled: ref !== '',
  })
}

export function useCreateCustomQuery() {
  return useMutation({
    mutationFn: (body: CustomQueryCreate) => createCustomQuery(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['analytics', 'custom'] })
    },
  })
}

type PatchVars = {
  ref: string
  body: CustomQueryPatch
}

export function usePatchCustomQuery() {
  return useMutation({
    mutationFn: ({ ref, body }: PatchVars) => patchCustomQuery(ref, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['analytics', 'custom'] })
    },
  })
}
