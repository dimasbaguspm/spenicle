import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/api/query'
import {
  createRule,
  listRules,
  patchRule,
  suggestCategory,
  type RuleFilters,
  type SuggestFilters,
} from '@/api/rules'
import type { RuleCreate, RulePatch } from '@/api/types'

export function useRules(filters: RuleFilters = {}) {
  return useQuery({
    queryKey: ['rules', filters],
    queryFn: () => listRules(filters),
  })
}

export function useCreateRule() {
  return useMutation({
    mutationFn: (body: RuleCreate) => createRule(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rules'] })
    },
  })
}

type PatchVars = {
  ref: string
  body: RulePatch
}

export function usePatchRule() {
  return useMutation({
    mutationFn: ({ ref, body }: PatchVars) => patchRule(ref, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rules'] })
    },
  })
}

/** Enabled only once there is something to match, so the panel never asks an empty question. */
export function useSuggestion(filters: SuggestFilters) {
  return useQuery({
    queryKey: ['rules', 'suggest', filters],
    queryFn: () => suggestCategory(filters),
    enabled: (filters.text ?? '') !== '' || filters.payee_ref !== undefined,
  })
}
