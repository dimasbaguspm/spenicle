/**
 * A half-typed entry, kept for the tab that typed it. Capture is the point of the product, so
 * losing a form to a reload costs more than a stale value does — and the key is session-scoped,
 * so closing the tab throws the draft away and a second tab starts clean.
 */
const key = 'spenicle.entry-draft'

export function readDraft<Value>(): Partial<Value> | null {
  try {
    const raw = sessionStorage.getItem(key)
    const parsed: unknown = raw === null ? null : JSON.parse(raw)

    return parsed === null || typeof parsed !== 'object' ? null : (parsed as Partial<Value>)
  } catch {
    return null
  }
}

/** A draft is a convenience, never a requirement: a full quota or a private tab may refuse it. */
export function writeDraft<Value>(value: Value): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* nothing to keep */
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* nothing to clear */
  }
}
