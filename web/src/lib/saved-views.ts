/**
 * The saved views this browser knows about. `POST /api/analytics/custom` answers a ref and there is
 * no list route, so the refs are kept here: losing them loses the shortcut, never the data.
 */
export type SavedView = {
  ref: string
  name: string
  namespace: string
  chart: string
}

const key = 'spenicle.views'

export function readViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed: unknown = raw === null ? [] : JSON.parse(raw)

    return Array.isArray(parsed) ? (parsed as SavedView[]) : []
  } catch {
    return []
  }
}

/** One entry per ref: saving the same view again replaces it instead of listing it twice. */
export function rememberView(view: SavedView): SavedView[] {
  const next = [...readViews().filter((row) => row.ref !== view.ref), view]

  localStorage.setItem(key, JSON.stringify(next))

  return next
}
