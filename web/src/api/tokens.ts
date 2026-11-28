import { api } from './client'
import { apiError } from './error'
import type { Paged, Paths, Token, TokenCreate, TokenIssued } from './types'

type TokensBody = Paths['/api/tokens']['get']['responses'][200]['content']['application/json']

export type TokenList = Paged<TokensBody, 'tokens', Token>

export async function listTokens(credential = ''): Promise<TokenList> {
  const { data, error, response } = await api.GET('/api/tokens', {
    headers: credential === '' ? {} : { Authorization: `Bearer ${credential}` },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as TokenList
}

export async function revokeToken(ref: string): Promise<Token> {
  const { data, error, response } = await api.POST('/api/tokens/{ref}/revoke', {
    params: { path: { ref } },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Token
}

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
