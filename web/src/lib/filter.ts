/**
 * What a filter has to say about itself: how to read it out of a URL, how to turn it into the
 * API's query, and how many of its fields are actually doing something. Pure types, so a module
 * can own its own spec without reaching for React.
 */
export type FilterSpec<State extends object, Query> = {
  /** no filter at all: the state a URL carries when nothing is narrowed */
  empty: State
  /** a URL is untrusted text, so this drops what it does not understand */
  parse: (raw: Record<string, unknown>) => State
  /** the one place a filter becomes a request */
  toQuery: (state: State, limit: number) => Query
  /** how many fields are set, for the chip and the Clear button */
  active: (state: State) => number
}

export type FilterQuery<State extends object, Query> = {
  /** the filter as it stands in the URL */
  value: State
  /** the same filter as the API wants it */
  query: Query
  /** how many fields are set */
  active: number
  /** write a filter to the URL, keeping the pinned fields of the route */
  apply: (next: State) => void
  /** back to `empty`, keeping the pinned fields */
  clear: () => void
}

/** The draft a sheet edits: the same shape, applied only when somebody says Apply. */
export function draftOf<State extends object>(state: State): State {
  return { ...state }
}

export function isEmptyDraft<State extends object>(draft: State, applied: State): boolean {
  return JSON.stringify(draft) === JSON.stringify(applied)
}
