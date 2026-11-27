import { useQuery } from '@tanstack/react-query'

import { fetchSettings } from '@/api/settings'

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
}
