import { api } from './client'
import { apiError } from './error'
import type { Connection, ConnectionStart, Paths } from './types'

export type ConnectionStartRequest =
  Paths['/api/connections/google']['post']['requestBody']['content']['application/json']

/** Root-only: the instance password is the credential, so it travels as an argument. */
export async function getConnection(credential = ''): Promise<Connection> {
  const { data, error, response } = await api.GET('/api/connections', {
    headers: credential === '' ? {} : { Authorization: `Bearer ${credential}` },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Connection
}

export async function startConnection(
  body: ConnectionStartRequest,
  credential: string,
): Promise<ConnectionStart> {
  const { data, error, response } = await api.POST('/api/connections/google', {
    headers: { Authorization: `Bearer ${credential}` },
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as ConnectionStart
}

export async function revokeConnection(ref: string, credential: string): Promise<Connection> {
  const { data, error, response } = await api.POST('/api/connections/{ref}/revoke', {
    headers: { Authorization: `Bearer ${credential}` },
    params: { path: { ref } },
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Connection
}
