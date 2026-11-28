import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query'

import { createEntry, getEntry, listEntries, patchEntry, type EntryFilters } from '@/api/entries'
import { queryClient } from '@/api/query'
import type { EntryCreate, EntryPatch } from '@/api/types'

export function useEntries(filters: EntryFilters = {}) {
  return useQuery({ queryKey: ['entries', filters], queryFn: () => listEntries(filters) })
}

/** The register, a page at a time: a cursor is what the API answers, so it is what we keep. */
export function useEntryPages(filters: EntryFilters) {
  return useInfiniteQuery({
    queryKey: ['entries', 'pages', filters],
    queryFn: ({ pageParam }) =>
      listEntries(pageParam === undefined ? filters : { ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor,
  })
}

type PatchEntryVars = {
  ref: string
  body: EntryPatch
}

/** A note is the one field a register can fix in place: amount, day and postings are a reversal. */
export function usePatchEntry() {
  return useMutation({
    mutationFn: ({ ref, body }: PatchEntryVars) => patchEntry(ref, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['entries'] })
    },
  })
}

export function useEntry(ref: string) {
  return useQuery({ queryKey: ['entries', ref], queryFn: () => getEntry(ref) })
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
