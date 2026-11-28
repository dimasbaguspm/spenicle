import { api } from './client'
import { apiError } from './error'
import type { PasswordChange, Settings, TokenCreate } from './types'

export async function fetchSettings(): Promise<Settings> {
  const { data, error, response } = await api.GET('/api/settings')
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Settings
}

/**
 * The one call a fresh instance accepts before its own password exists: it needs the
 * current one. Passing `mint` also exchanges the new password for the browser token in
 * the same request, so the first boot costs one call instead of two.
 */
export async function changePassword(
  current: string,
  next: string,
  mint?: TokenCreate,
): Promise<PasswordChange> {
  const { data, error, response } = await api.POST('/api/password', {
    headers: { Authorization: `Bearer ${current}` },
    body: {
      current_password: current,
      new_password: next,
      ...(mint === undefined ? {} : { token: mint }),
    },
  })

  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as PasswordChange
}
