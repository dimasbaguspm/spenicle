import { api } from './client'
import { apiError } from './error'
import { token } from './token'
import type {
  ImportBatch,
  ImportDetail,
  ImportEvent,
  ImportReview,
  ImportRowPatch,
  Paged,
  Paths,
} from './types'

type ImportsPage = Paths['/api/imports']['get']['responses'][200]['content']['application/json']
type EventsPage =
  Paths['/api/imports/{ref}/events']['get']['responses'][200]['content']['application/json']

export type ImportFilters = NonNullable<Paths['/api/imports']['get']['parameters']['query']>
export type ImportEventFilters = NonNullable<
  Paths['/api/imports/{ref}/events']['get']['parameters']['query']
>

export type ImportList = Paged<ImportsPage, 'imports', ImportBatch>
export type ImportEventList = Paged<EventsPage, 'events', ImportEvent>

export async function listImports(filters: ImportFilters = {}): Promise<ImportList> {
  const { data, error, response } = await api.GET('/api/imports', { params: { query: filters } })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as ImportList
}

export async function getImport(ref: string): Promise<ImportDetail> {
  const { data, error, response } = await api.GET('/api/imports/{ref}', {
    params: { path: { ref } },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as ImportDetail
}

export async function listImportEvents(
  ref: string,
  filters: ImportEventFilters = {},
): Promise<ImportEventList> {
  const { data, error, response } = await api.GET('/api/imports/{ref}/events', {
    params: { path: { ref }, query: filters },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as ImportEventList
}

export async function reviewImport(ref: string, body: ImportReview): Promise<ImportDetail> {
  const { data, error, response } = await api.PATCH('/api/imports/{ref}', {
    params: { path: { ref } },
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as ImportDetail
}

export async function patchImportRow(
  ref: string,
  index: number,
  body: ImportRowPatch,
): Promise<ImportDetail> {
  const { data, error, response } = await api.PATCH('/api/imports/{ref}/rows/{index}', {
    params: { path: { ref, index } },
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as ImportDetail
}

/** What a client hands the importer: one CSV, the account it moves through, and its own key. */
export type ImportUpload = {
  file: File
  idempotencyKey: string
  accountRef?: string | undefined
}

/**
 * The second multipart route in the app, so `fetch` again: the typed client sends JSON, and a
 * statement is a file. The envelope is shared, so the error reads the same as everywhere else.
 */
export async function createImport(input: ImportUpload): Promise<ImportDetail> {
  const body = new FormData()
  body.set('file', input.file)
  body.set('idempotency_key', input.idempotencyKey)

  if (input.accountRef !== undefined) {
    body.set('account_ref', input.accountRef)
  }

  const credential = token()
  const response = await fetch('/api/imports', {
    method: 'POST',
    headers: credential === undefined ? {} : { Authorization: `Bearer ${credential}` },
    body,
  })
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw apiError(response.status, payload)
  }

  return payload as ImportDetail
}
