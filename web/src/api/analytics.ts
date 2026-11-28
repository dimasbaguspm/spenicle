import { api } from './client'
import { apiError } from './error'
import type {
  CategoryReport,
  CustomQuery,
  CustomQueryCreate,
  CustomQueryPatch,
  CustomRun,
  MonthTotal,
  Paths,
} from './types'

type MonthsBody =
  Paths['/api/analytics/months']['get']['responses'][200]['content']['application/json']
type CategoriesBody =
  Paths['/api/analytics/categories']['get']['responses'][200]['content']['application/json']
type CategoryQuery = NonNullable<Paths['/api/analytics/categories']['get']['parameters']['query']>
type RunQuery = NonNullable<Paths['/api/analytics/custom/{ref}']['get']['parameters']['query']>

export async function fetchMonths(from: string, to: string): Promise<MonthTotal[]> {
  const { data, error, response } = await api.GET('/api/analytics/months', {
    params: { query: { from, to } },
  })

  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return ((data as MonthsBody).months ?? []) as MonthTotal[]
}

export async function fetchCategories(query: CategoryQuery): Promise<CategoryReport> {
  const { data, error, response } = await api.GET('/api/analytics/categories', {
    params: { query },
  })

  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as CategoriesBody as CategoryReport
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
