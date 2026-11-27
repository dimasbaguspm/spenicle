import { api } from './client'
import { apiError } from './error'
import type { Paged, Payee, PayeeCreate, Paths } from './types'

type PayeesPage = Paths['/api/payees']['get']['responses'][200]['content']['application/json']

export type PayeeFilters = NonNullable<Paths['/api/payees']['get']['parameters']['query']>

export type PayeeList = Paged<PayeesPage, 'payees', Payee>

export async function listPayees(filters: PayeeFilters = {}): Promise<PayeeList> {
  const { data, error, response } = await api.GET('/api/payees', { params: { query: filters } })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as PayeeList
}

export async function createPayee(body: PayeeCreate): Promise<Payee> {
  const { data, error, response } = await api.POST('/api/payees', { body })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Payee
}
