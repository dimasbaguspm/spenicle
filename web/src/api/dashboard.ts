import { api } from './client'
import { apiError } from './error'
import type { Dashboard } from './types'

/** The landing screen in one call: window totals, the month series, pending captures, the top category. */
export async function fetchDashboard(from: string, to: string): Promise<Dashboard> {
  const { data, error, response } = await api.GET('/api/dashboard', {
    params: { query: { from, to } },
  })

  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Dashboard
}
