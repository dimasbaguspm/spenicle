import { useQuery } from '@tanstack/react-query'

import { fetchCategories, fetchMonths } from '@/api/analytics'
import type { Paths } from '@/api/types'

type CategoryQuery = NonNullable<Paths['/api/analytics/categories']['get']['parameters']['query']>

export function useMonths(from: string, to: string) {
  return useQuery({
    queryKey: ['analytics', 'months', from, to],
    queryFn: () => fetchMonths(from, to),
  })
}

export function useCategories(query: CategoryQuery) {
  return useQuery({
    queryKey: ['analytics', 'categories', query],
    queryFn: () => fetchCategories(query),
  })
}
