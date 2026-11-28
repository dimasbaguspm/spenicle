import type { FilterQuery, FilterSpec } from '@/lib/filter'

/**
 * The filter layer every list shares: the route owns the URL, the spec owns the mapping, and this
 * joins them. A screen passes what it read (`search`), where to write (`onChange`) and its spec;
 * it gets the state, the query and the two commands, so no screen spells a query param.
 *
 * It is derived, not stored: no memo, no state, nothing to keep in sync.
 */
export function useFilterQuery<State extends object, Query>({
  search,
  onChange,
  spec,
  limit,
  pinned,
}: {
  search: State
  onChange: (next: State) => void
  spec: FilterSpec<State, Query>
  limit: number
  /** fields the route is about, which a filter may not unsay: `/accounts/$ref` pins the account */
  pinned?: Partial<State> | undefined
}): FilterQuery<State, Query> {
  const value = pinned === undefined ? search : { ...search, ...pinned }

  const apply = (next: State) => {
    onChange(pinned === undefined ? next : { ...next, ...pinned })
  }

  return {
    value,
    query: spec.toQuery(value, limit),
    active: spec.active(value),
    apply,
    clear: () => {
      apply(spec.empty)
    },
  }
}
