import { useQuery } from '@tanstack/react-query'

import { fetchDashboard } from '@/api/dashboard'

export function useDashboard(from: string, to: string) {
  return useQuery({ queryKey: ['dashboard', from, to], queryFn: () => fetchDashboard(from, to) })
}
