import { api } from './client'
import { apiError } from './error'
import type { AuditRow, Paths } from './types'

type AuditPage = Paths['/api/audit']['get']['responses'][200]['content']['application/json']

export type AuditFilters = NonNullable<Paths['/api/audit']['get']['parameters']['query']>

export type AuditList = {
  audit: AuditRow[]
  next_cursor?: string
  has_more: boolean
  limit: number
}

/** The journal's read side: who changed what, when, and the two snapshots around the change. */
export async function listAudit(filters: AuditFilters = {}): Promise<AuditList> {
  const { data, error, response } = await api.GET('/api/audit', { params: { query: filters } })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as AuditList & AuditPage
}
