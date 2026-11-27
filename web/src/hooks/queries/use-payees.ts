import { useQuery } from '@tanstack/react-query'

import { listPayees, type PayeeFilters } from '@/api/payees'

export function usePayees(filters: PayeeFilters = {}) {
  return useQuery({ queryKey: ['payees', filters], queryFn: () => listPayees(filters) })
}
