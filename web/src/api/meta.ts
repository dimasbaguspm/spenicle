import { api } from './client'
import { apiError } from './error'
import type { Meta } from './types'

/** The credential is optional because the first boot reads it before any token exists. */
export async function fetchMeta(credential?: string): Promise<Meta> {
  const init =
    credential === undefined ? undefined : { headers: { Authorization: `Bearer ${credential}` } }
  const { data, error, response } = await api.GET('/api/meta', init)
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as Meta
}
