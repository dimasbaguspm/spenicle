import { redirect } from '@tanstack/react-router'

/**
 * A capture has one edit and it is the review: approving or rejecting it. The route exists so the
 * list/new/detail/edit shape holds, and it points at the screen that actually decides.
 */
export function editCaptureRedirect(ref: string) {
  // eslint-disable-next-line @typescript-eslint/only-throw-error -- the router's own control flow
  throw redirect({ to: '/manage/captures/$ref', params: { ref } })
}
