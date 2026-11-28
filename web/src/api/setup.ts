import { api } from './client'
import { apiError } from './error'
import type { LedgerSetup, Settings } from './types'

/**
 * The wizard's one write. Root credential only, so the caller brings the password it
 * just set: a token can never lock the base currency or post an opening balance.
 */
export async function openLedger(password: string, body: LedgerSetup): Promise<Settings> {
  const { data, error, response } = await api.POST('/api/setup', {
    headers: { Authorization: `Bearer ${password}` },
    body,
  })

  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Settings
}
