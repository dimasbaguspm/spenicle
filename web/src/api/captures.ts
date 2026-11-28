import { api } from './client'
import { apiError } from './error'
import { token } from './token'
import type { Capture, CaptureApproval, CaptureReview, Paged, Paths } from './types'

type CapturesPage = Paths['/api/captures']['get']['responses'][200]['content']['application/json']

export type CaptureFilters = NonNullable<Paths['/api/captures']['get']['parameters']['query']>

export type CaptureList = Paged<CapturesPage, 'captures', Capture>

/** `approve` answers the capture and the entry it posted, a rejection answers the capture. */
export type CaptureReviewResult = Capture | CaptureApproval

export async function listCaptures(filters: CaptureFilters = {}): Promise<CaptureList> {
  const { data, error, response } = await api.GET('/api/captures', { params: { query: filters } })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as CaptureList
}

export async function reviewCapture(
  ref: string,
  body: CaptureReview,
): Promise<CaptureReviewResult> {
  const { data, error, response } = await api.PATCH('/api/captures/{ref}', {
    params: { path: { ref } },
    body,
  })
  if (error !== undefined) {
    throw apiError(response.status, error)
  }

  return data as CaptureReviewResult
}

/** What a client can hand the intake: one file, a kind, optionally the text beside it. */
export type CaptureUpload = {
  file: File
  kind?: string | undefined
  rawText?: string | undefined
}

/**
 * A photo or a forwarded file. This is the one multipart route in the app, so it goes through
 * `fetch` rather than the typed client; the envelope stays the same, so the error reads the same.
 */
export async function createCapture(input: CaptureUpload): Promise<Capture> {
  const body = new FormData()
  body.set('file', input.file)

  if (input.kind !== undefined) {
    body.set('kind', input.kind)
  }

  if (input.rawText !== undefined) {
    body.set('raw_text', input.rawText)
  }

  const credential = token()
  const response = await fetch('/api/captures', {
    method: 'POST',
    headers: credential === undefined ? {} : { Authorization: `Bearer ${credential}` },
    body,
  })
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw apiError(response.status, payload)
  }

  return payload as Capture
}

/** A download is a blob and the name the API put on it: `<a download>` would arrive unauthenticated. */
export type ArtifactFile = {
  blob: Blob
  filename: string
}

/**
 * The document behind a capture, byte for byte as it was uploaded. The file is the reviewer's only
 * source of truth, so a capture with no artifact answers `404` and a reclaimed one `410`, and both
 * reach the screen as the API worded them.
 */
export async function downloadArtifact(ref: string): Promise<ArtifactFile> {
  const credential = token()
  const response = await fetch(`/api/captures/${ref}/artifact`, {
    headers: credential === undefined ? {} : { Authorization: `Bearer ${credential}` },
  })

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw apiError(response.status, payload)
  }

  const disposition = response.headers.get('Content-Disposition') ?? ''
  const named = /filename="([^"]+)"/.exec(disposition)

  return { blob: await response.blob(), filename: named?.[1] ?? `capture-${ref}` }
}
