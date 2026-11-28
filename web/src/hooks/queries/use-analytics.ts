import { useQuery } from '@tanstack/react-query'

import { fetchOverview } from '@/api/analytics'

/** The one call the analytics screen makes: everything the brief draws arrives together. */
export function useOverview(from: string, to: string) {
  return useQuery({
    queryKey: ['analytics', 'overview', from, to],
    queryFn: () => fetchOverview(from, to),
  })
}
