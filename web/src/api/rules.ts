import { api } from './client'
import { apiError } from './error'
import type { Paths, Paged, Rule, RuleCreate, RulePatch, Suggestion } from './types'

type RulesPage =
  Paths['/api/categorization/rules']['get']['responses'][200]['content']['application/json']

export type RuleFilters = NonNullable<
  Paths['/api/categorization/rules']['get']['parameters']['query']
>
export type SuggestFilters = NonNullable<
  Paths['/api/categorization/suggest']['get']['parameters']['query']
>

export type RuleList = Paged<RulesPage, 'rules', Rule>

export async function listRules(filters: RuleFilters = {}): Promise<RuleList> {
  const { data, error, response } = await api.GET('/api/categorization/rules', {
    params: { query: filters },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as RuleList
}

export async function createRule(body: RuleCreate): Promise<Rule> {
  const { data, error, response } = await api.POST('/api/categorization/rules', { body })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Rule
}

export async function patchRule(ref: string, body: RulePatch): Promise<Rule> {
  const { data, error, response } = await api.PATCH('/api/categorization/rules/{ref}', {
    params: { path: { ref } },
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Rule
}

/** What the instance would pre-fill for a line, and the reason it gives. Writes nothing. */
export async function suggestCategory(filters: SuggestFilters): Promise<Suggestion> {
  const { data, error, response } = await api.GET('/api/categorization/suggest', {
    params: { query: filters },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Suggestion
}
