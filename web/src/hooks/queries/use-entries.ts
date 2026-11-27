import { useMutation, useQuery } from '@tanstack/react-query'

import { createEntry, listEntries, type EntryFilters } from '@/api/entries'
import { queryClient } from '@/api/query'
import type { EntryCreate } from '@/api/types'

export function useEntries(filters: EntryFilters = {}) {
  return useQuery({ queryKey: ['entries', filters], queryFn: () => listEntries(filters) })
}

export function useCreateEntry() {
  return useMutation({
    mutationFn: (body: EntryCreate) => createEntry(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entries'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
  })
}
