import { api } from './client'
import { apiError } from './error'
import type { Entry, EntryCreate, EntryPatch, Paged, Paths } from './types'

type EntriesPage = Paths['/api/entries']['get']['responses'][200]['content']['application/json']

export type EntryFilters = NonNullable<Paths['/api/entries']['get']['parameters']['query']>

export type EntryList = Paged<EntriesPage, 'entries', Entry>

export async function listEntries(filters: EntryFilters = {}): Promise<EntryList> {
  const { data, error, response } = await api.GET('/api/entries', { params: { query: filters } })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as EntryList
}

export async function getEntry(ref: string): Promise<Entry> {
  const { data, error, response } = await api.GET('/api/entries/{ref}', {
    params: { path: { ref } },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Entry
}

export async function patchEntry(ref: string, body: EntryPatch): Promise<Entry> {
  const { data, error, response } = await api.PATCH('/api/entries/{ref}', {
    params: { path: { ref } },
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Entry
}

export async function createEntry(body: EntryCreate): Promise<Entry> {
  const { data, error, response } = await api.POST('/api/entries', { body })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Entry
}
