import { useMutation, useQuery } from '@tanstack/react-query'

import {
  createExport,
  getExport,
  listExportEvents,
  listExports,
  type ExportCreate,
  type ExportFilters,
} from '@/api/exports'
import { queryClient } from '@/api/query'

export function useExports(filters: ExportFilters = {}) {
  return useQuery({ queryKey: ['exports', filters], queryFn: () => listExports(filters) })
}

export function useCreateExport() {
  return useMutation({
    mutationFn: (body: ExportCreate) => createExport(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exports'] })
    },
  })
}

export function useExportEvents(ref: string) {
  return useQuery({
    queryKey: ['exports', ref, 'events'],
    queryFn: () => listExportEvents(ref),
    enabled: ref !== '',
  })
}

/** One job, by ref: the detail page reads what the list only summarises. */
export function useExport(ref: string) {
  return useQuery({
    queryKey: ['exports', ref],
    queryFn: () => getExport(ref),
    enabled: ref !== '',
  })
}
