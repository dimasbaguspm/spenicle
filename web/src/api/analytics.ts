import { api } from './client'
import { apiError } from './error'
import type { AnalyticsOverview, Paths } from './types'

type OverviewBody =
  Paths['/api/analytics/overview']['get']['responses'][200]['content']['application/json']

/** The brief, once: months, category roots, payees, money accounts and two stats. */
export async function fetchOverview(from: string, to: string): Promise<AnalyticsOverview> {
  const { data, error, response } = await api.GET('/api/analytics/overview', {
    params: { query: { from, to } },
  })

  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as OverviewBody as AnalyticsOverview
}
