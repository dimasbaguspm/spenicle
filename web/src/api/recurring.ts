import { api } from './client'
import { apiError } from './error'
import type { Paged, Paths, RecurringRule } from './types'

type RecurringBody = Paths['/api/recurring']['get']['responses'][200]['content']['application/json']

export type RecurringFilters = NonNullable<Paths['/api/recurring']['get']['parameters']['query']>
export type RecurringCreate =
  Paths['/api/recurring']['post']['requestBody']['content']['application/json']
export type RecurringPatch =
  Paths['/api/recurring/{ref}']['patch']['requestBody']['content']['application/json']
export type RecurringList = Paged<RecurringBody, 'recurring', RecurringRule>

export async function listRecurring(filters: RecurringFilters = {}): Promise<RecurringList> {
  const { data, error, response } = await api.GET('/api/recurring', { params: { query: filters } })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as RecurringList
}

export async function createRecurring(body: RecurringCreate): Promise<RecurringRule> {
  const { data, error, response } = await api.POST('/api/recurring', { body })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as RecurringRule
}

export async function patchRecurring(ref: string, body: RecurringPatch): Promise<RecurringRule> {
  const { data, error, response } = await api.PATCH('/api/recurring/{ref}', {
    params: { path: { ref } },
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as RecurringRule
}
