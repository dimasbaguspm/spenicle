import { api } from './client'
import { apiError } from './error'
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
