/** One failed request: the status the API answered and the code its shared envelope named. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly traceId: string | undefined

  constructor(status: number, code: string, message: string, traceId: string | undefined) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.traceId = traceId
  }
}

type Detail = {
  code: string | undefined
  message: string | undefined
  traceId: string | undefined
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/** Read `{ error: { code, message, trace_id } }` without trusting a single field of it. */
function detailOf(body: unknown): Detail {
  const empty: Detail = { code: undefined, message: undefined, traceId: undefined }

  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return empty
  }

  const { error } = body
  if (typeof error !== 'object' || error === null) {
    return empty
  }

  return {
    code: 'code' in error ? text(error.code) : undefined,
    message: 'message' in error ? text(error.message) : undefined,
    traceId: 'trace_id' in error ? text(error.trace_id) : undefined,
  }
}

/**
 * The only place an API failure becomes an Error. A body that is not the envelope, or one
 * that carries no message, still answers something a screen can show.
 */
export function apiError(status: number, body: unknown): ApiError {
  const detail = detailOf(body)
  const code = detail.code ?? 'unknown'
  const message =
    detail.message === undefined
      ? `request failed (${status.toString()})`
      : `${code}: ${detail.message}`

  return new ApiError(status, code, message, detail.traceId)
}

/** A bundler can duplicate the class, so the name it stamps is checked as well. */
export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError || (value instanceof Error && value.name === 'ApiError')
}
