import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/api/query'
import { createToken, listTokens, revokeToken } from '@/api/tokens'
import type { TokenCreate } from '@/api/types'

/** Reading the token list is root-only, so the instance password is what opens it. */
export function useTokenList(credential: string) {
  return useQuery({
    queryKey: ['tokens', credential],
    queryFn: () => listTokens(credential),
    enabled: credential !== '',
  })
}

export function useRevokeToken() {
  return useMutation({
    mutationFn: (ref: string) => revokeToken(ref),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tokens'] })
    },
  })
}

type CreateTokenVars = {
  body: TokenCreate
  credential: string
}

export function useCreateToken() {
  return useMutation({
    mutationFn: ({ body, credential }: CreateTokenVars) => createToken(body, credential),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tokens'] })
    },
  })
}
