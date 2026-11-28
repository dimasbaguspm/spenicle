import { useQuery } from '@tanstack/react-query'

import { fetchMeta } from '@/api/meta'

export function useMeta() {
  return useQuery({ queryKey: ['meta'], queryFn: () => fetchMeta() })
}
