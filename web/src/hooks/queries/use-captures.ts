// Effect stays where it already is: the form resolver, validating the one boundary a person
// types into. The fetch path stays plain async + TanStack Query, whose retry/stale/cache contract
// an Effect runtime would only have to be bridged back into — no concurrency or scopes gained.
import { useMutation, useQuery } from '@tanstack/react-query'

import { listCaptures, reviewCapture, type CaptureFilters } from '@/api/captures'
import { queryClient } from '@/api/query'
import type { CaptureReview } from '@/api/types'

type ReviewCaptureVars = {
  ref: string
  body: CaptureReview
}

export function useCaptures(filters: CaptureFilters = {}) {
  return useQuery({ queryKey: ['captures', filters], queryFn: () => listCaptures(filters) })
}

export function useReviewCapture() {
  return useMutation({
    mutationFn: ({ ref, body }: ReviewCaptureVars) => reviewCapture(ref, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['captures'] })
      await queryClient.invalidateQueries({ queryKey: ['entries'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
  })
}
