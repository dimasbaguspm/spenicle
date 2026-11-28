import { useMutation, useQuery } from '@tanstack/react-query'

import { createPayee, listPayees, patchPayee, type PayeeFilters } from '@/api/payees'
import { queryClient } from '@/api/query'
import type { PayeeCreate, PayeePatch } from '@/api/types'

type PatchPayeeVars = {
  ref: string
  body: PayeePatch
}

export function usePayees(filters: PayeeFilters = {}) {
  return useQuery({ queryKey: ['payees', filters], queryFn: () => listPayees(filters) })
}

export function useCreatePayee() {
  return useMutation({
    mutationFn: (body: PayeeCreate) => createPayee(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payees'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
  })
}

export function usePatchPayee() {
  return useMutation({
    mutationFn: ({ ref, body }: PatchPayeeVars) => patchPayee(ref, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payees'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
  })
}
