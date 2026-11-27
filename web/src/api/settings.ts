import { api } from './client'
import { apiError } from './error'
import type { Settings } from './types'

export async function fetchSettings(): Promise<Settings> {
  const { data, error, response } = await api.GET('/api/settings')
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Settings
}
