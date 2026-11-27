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

/** The one call a fresh instance accepts before its password is set: it needs the current one. */
export async function changePassword(current: string, next: string): Promise<Settings> {
  const { data, error, response } = await api.POST('/api/password', {
    headers: { Authorization: `Bearer ${current}` },
    body: { current_password: current, new_password: next },
  })

  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Settings
}
