import createClient from 'openapi-fetch'

import type { paths } from './schema'

import { clearToken, token } from './token'

/**
 * One client, same origin. In production `spenicle http` serves the built SPA and
 * `/api` on the same port, so there is no base URL to configure and no CORS.
 */
export const api = createClient<paths>({ baseUrl: '' })

api.use({
  onRequest({ request }) {
    const credential = token()
    if (credential !== undefined) {
      request.headers.set('Authorization', `Bearer ${credential}`)
    }

    return request
  },
  onResponse({ response }) {
    // a revoked or expired token is not a retry: drop it and let the guard route
    if (response.status === 401) {
      clearToken()
    }

    return response
  },
})

/** unwrap the shared error envelope so a screen can show the code the API named */
export function errorMessage(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = (body as { error?: { code?: string; message?: string } }).error
    if (error?.message !== undefined) {
      return `${error.code ?? 'error'}: ${error.message}`
    }
  }

  return `request failed (${status.toString()})`
}
