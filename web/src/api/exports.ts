import { api } from './client'
import { apiError } from './error'
import { token } from './token'
import type { components, ExportJob, Fixed, Paged, Paths } from './types'

type ExportsPage = Paths['/api/exports']['get']['responses'][200]['content']['application/json']

type ExportEventsPage =
  Paths['/api/exports/{ref}/events']['get']['responses'][200]['content']['application/json']

export type ExportFilters = NonNullable<Paths['/api/exports']['get']['parameters']['query']>

export type ExportCreate =
  Paths['/api/exports']['post']['requestBody']['content']['application/json']

export type ExportList = Paged<ExportsPage, 'exports', ExportJob>

export type ExportEvent = Fixed<components['schemas']['exportEventResponse']>

export type ExportEventList = Paged<ExportEventsPage, 'events', ExportEvent>

export async function listExports(filters: ExportFilters = {}): Promise<ExportList> {
  const { data, error, response } = await api.GET('/api/exports', { params: { query: filters } })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as ExportList
}

export async function createExport(body: ExportCreate): Promise<ExportJob> {
  const { data, error, response } = await api.POST('/api/exports', { body })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as ExportJob
}

export async function getExport(ref: string): Promise<ExportJob> {
  const { data, error, response } = await api.GET('/api/exports/{ref}', {
    params: { path: { ref } },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as ExportJob
}

export async function listExportEvents(ref: string): Promise<ExportEventList> {
  const { data, error, response } = await api.GET('/api/exports/{ref}/events', {
    params: { path: { ref } },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as ExportEventList
}

/** The bytes are a route, and that route wants a header: the file is fetched, not linked. */
export async function downloadExport(ref: string): Promise<Blob> {
  const credential = token()
  const response = await fetch(`/api/exports/${ref}/download`, {
    headers: credential === undefined ? {} : { Authorization: `Bearer ${credential}` },
  })

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw apiError(response.status, payload)
  }

  return response.blob()
}
