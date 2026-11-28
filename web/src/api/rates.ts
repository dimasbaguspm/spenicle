import { api } from './client'
import { apiError } from './error'
import type { Paths, Rate } from './types'

export type RateQuery = NonNullable<Paths['/api/rates']['get']['parameters']['query']>

/**
 * One pair, one day. The API answers from its cache, then the stored sheet for that day, then the
 * nearest earlier day, then a cross rate through EUR, so a rate always comes back with the date it
 * actually priced and the rail that priced it.
 */
export async function getRate(query: RateQuery): Promise<Rate> {
  const { data, error, response } = await api.GET('/api/rates', { params: { query } })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Rate
}
