import { useMutation, useQuery } from '@tanstack/react-query'

import {
  createImport,
  getImport,
  listImportEvents,
  listImports,
  patchImportRow,
  reviewImport,
  type ImportEventFilters,
  type ImportFilters,
  type ImportUpload,
} from '@/api/imports'
import { queryClient } from '@/api/query'
import type { ImportReview, ImportRowPatch } from '@/api/types'

export function useImports(filters: ImportFilters = {}) {
  return useQuery({
    queryKey: ['imports', filters],
    queryFn: () => listImports(filters),
  })
}

export function useImport(ref: string) {
  return useQuery({
    queryKey: ['imports', ref],
    queryFn: () => getImport(ref),
  })
}

export function useImportEvents(ref: string, filters: ImportEventFilters = {}) {
  return useQuery({
    queryKey: ['imports', ref, 'events', filters],
    queryFn: () => listImportEvents(ref, filters),
  })
}

export function useCreateImport() {
  return useMutation({
    mutationFn: (input: ImportUpload) => createImport(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['imports'] })
    },
  })
}

type ReviewVars = {
  ref: string
  body: ImportReview
}

export function useReviewImport() {
  return useMutation({
    mutationFn: ({ ref, body }: ReviewVars) => reviewImport(ref, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['imports'] })
      await queryClient.invalidateQueries({ queryKey: ['entries'] })
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

type RowVars = {
  ref: string
  index: number
  body: ImportRowPatch
}

export function usePatchImportRow() {
  return useMutation({
    mutationFn: ({ ref, index, body }: RowVars) => patchImportRow(ref, index, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['imports'] })
    },
  })
}
