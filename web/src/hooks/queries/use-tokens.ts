import { useMutation } from '@tanstack/react-query'

import { queryClient } from '@/api/query'
import { createToken } from '@/api/tokens'
import type { TokenCreate } from '@/api/types'

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
