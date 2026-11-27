import { api } from './client'
import { apiError } from './error'
import type { Account, AccountCreate, AccountDetail, AccountPatch, Paged, Paths } from './types'

export type AccountFilters = NonNullable<Paths['/api/accounts']['get']['parameters']['query']>

type AccountsPage = Paths['/api/accounts']['get']['responses'][200]['content']['application/json']

export type AccountList = Paged<AccountsPage, 'accounts', Account>

export async function listAccounts(filters: AccountFilters = {}): Promise<AccountList> {
  const { data, error, response } = await api.GET('/api/accounts', { params: { query: filters } })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as AccountList
}

export async function createAccount(body: AccountCreate): Promise<AccountDetail> {
  const { data, error, response } = await api.POST('/api/accounts', { body })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as AccountDetail
}

export async function patchAccount(ref: string, body: AccountPatch): Promise<AccountDetail> {
  const { data, error, response } = await api.PATCH('/api/accounts/{ref}', {
    params: { path: { ref } },
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as AccountDetail
}
