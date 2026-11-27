import { api } from './client'
import { apiError } from './error'
import type { Meta } from './types'

export async function fetchMeta(): Promise<Meta> {
  const { data, error, response } = await api.GET('/api/meta')
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Meta
}
