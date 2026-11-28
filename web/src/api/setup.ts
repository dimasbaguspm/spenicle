import { api } from './client'
import { apiError } from './error'
import type { LedgerSetup, Settings } from './types'

/**
 * The claim write. A fresh instance is open, so there is no credential to send: the
 * body carries the password the instance is being closed with, in the same transaction
 * that locks the base currency and posts the opening balances.
 */
export async function openLedger(body: LedgerSetup): Promise<Settings> {
  const { data, error, response } = await api.POST('/api/setup', { body })

  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Settings
}
