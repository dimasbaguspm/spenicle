import { useQuery } from '@tanstack/react-query'

import { fetchBootstrap } from '@/api/bootstrap'

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: fetchBootstrap,
    staleTime: 0,
    retry: false,
  })
}
