import { api } from './client'
import { apiError } from './error'
import type { Bootstrap } from './types'

/**
 * The one read that needs no credential: it says whether the ledger is opened yet and
 * whether the password is still the one the boot generated, so the shell can choose
 * between the setup wizard and the sign-in screen before it holds anything.
 */
export async function fetchBootstrap(): Promise<Bootstrap> {
  const { data, error, response } = await api.GET('/api/bootstrap')
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Bootstrap
}
