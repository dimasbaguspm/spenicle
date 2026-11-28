import { createRoute, redirect } from '@tanstack/react-router'

/**
 * A capture is a photo or a file, and the entry screen already owns that picker: the photo intake
 * uploads it to the queue. So `/manage/captures/new` is a signpost, not a second form.
 */
export function newCaptureRedirect() {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- the router's own control flow
  throw redirect({ to: '/ledger/new', search: { mode: 'photo' } })
}

export { createRoute }
