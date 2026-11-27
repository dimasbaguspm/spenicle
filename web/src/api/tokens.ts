import { api } from './client'
import { apiError } from './error'
import type { TokenCreate, TokenIssued } from './types'

/**
 * Minting a token is the one call the instance password authorises, so the credential is an
 * argument and its header outranks the stored one. The plaintext comes back exactly once.
 */
export async function createToken(body: TokenCreate, credential: string): Promise<TokenIssued> {
  const { data, error, response } = await api.POST('/api/tokens', {
    headers: { Authorization: `Bearer ${credential}` },
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as TokenIssued
}
