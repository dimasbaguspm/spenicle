import { useMutation, useQuery } from '@tanstack/react-query'

import { createAccount, listAccounts, patchAccount, type AccountFilters } from '@/api/accounts'
import { queryClient } from '@/api/query'
import type { AccountCreate, AccountPatch } from '@/api/types'

type PatchAccountVars = {
  ref: string
  body: AccountPatch
}

export function useAccounts(filters: AccountFilters = {}) {
  return useQuery({ queryKey: ['accounts', filters], queryFn: () => listAccounts(filters) })
}

export function useCreateAccount() {
  return useMutation({
    mutationFn: (body: AccountCreate) => createAccount(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
  })
}

export function usePatchAccount() {
  return useMutation({
    mutationFn: ({ ref, body }: PatchAccountVars) => patchAccount(ref, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
  })
}
