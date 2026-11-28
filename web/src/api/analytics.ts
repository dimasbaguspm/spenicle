import { api } from './client'
import { apiError } from './error'
import type { CategoryReport, MonthTotal, Paths } from './types'

type MonthsBody =
  Paths['/api/analytics/months']['get']['responses'][200]['content']['application/json']
type CategoriesBody =
  Paths['/api/analytics/categories']['get']['responses'][200]['content']['application/json']
type CategoryQuery = NonNullable<Paths['/api/analytics/categories']['get']['parameters']['query']>

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
