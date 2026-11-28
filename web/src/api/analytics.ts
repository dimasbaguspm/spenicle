import { api } from './client'
import { apiError } from './error'
import type {
  AnalyticsOverview,
  CustomQuery,
  CustomQueryCreate,
  CustomQueryPatch,
  CustomRun,
  Paths,
} from './types'

type RunQuery = NonNullable<Paths['/api/analytics/custom/{ref}']['get']['parameters']['query']>

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

/** Save the question, not the answer: a name, a namespace and the chart to draw. */
export async function createCustomQuery(body: CustomQueryCreate): Promise<CustomQuery> {
  const { data, error, response } = await api.POST('/api/analytics/custom', { body })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as CustomQuery
}

/** Run a saved view over a window; the answer echoes the query so the screen draws the right chart. */
export async function runCustomQuery(ref: string, query: RunQuery = {}): Promise<CustomRun> {
  const { data, error, response } = await api.GET('/api/analytics/custom/{ref}', {
    params: { path: { ref }, query },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as CustomRun
}

export async function patchCustomQuery(ref: string, body: CustomQueryPatch): Promise<CustomQuery> {
  const { data, error, response } = await api.PATCH('/api/analytics/custom/{ref}', {
    params: { path: { ref } },
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as CustomQuery
}
