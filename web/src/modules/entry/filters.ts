import type { EntryFilters } from '@/api/entries'
import type { FilterSpec } from '@/lib/filter'

/** What a ledger URL may carry. Strings only, because a URL is text and a filter is optional. */
export type EntrySearch = {
  from?: string | undefined
  to?: string | undefined
  account?: string | undefined
  category?: string | undefined
  payee?: string | undefined
  q?: string | undefined
  reversed?: 'true' | 'false' | undefined
}

export const noEntryFilters: EntrySearch = {}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

/** A URL is untrusted text: keep the keys the ledger understands and drop everything else. */
export function entrySearch(raw: Record<string, unknown>): EntrySearch {
  const reversed = text(raw.reversed)

  return {
    from: text(raw.from),
    to: text(raw.to),
    account: text(raw.account),
    category: text(raw.category),
    payee: text(raw.payee),
    q: text(raw.q),
    reversed: reversed === 'true' || reversed === 'false' ? reversed : undefined,
  }
}

/** One place where a filter becomes a request, so a screen never spells a query param itself. */
export function entryQuery(search: EntrySearch, limit: number): EntryFilters {
  const query: EntryFilters = { limit }

  if (search.from !== undefined) {
    query.from = search.from
  }

  if (search.to !== undefined) {
    query.to = search.to
  }

  // an account and a category are both accounts on the wire, and the API widens a list:
  // "cash or groceries" is one `account_ref`, never two filters that could contradict
  const touching = [search.account, search.category].filter((list) => list !== undefined)

  if (touching.length > 0) {
    query.account_ref = touching.join(',')
  }

  if (search.payee !== undefined) {
    query.payee_ref = search.payee
  }

  if (search.q !== undefined) {
    query.query = search.q
  }

  if (search.reversed !== undefined) {
    query.reversed = search.reversed
  }

  return query
}

export function filterCount(search: EntrySearch): number {
  return [
    search.from,
    search.to,
    search.account,
    search.category,
    search.payee,
    search.q,
    search.reversed,
  ].filter((value) => value !== undefined).length
}

/**
 * The entry filter as one value: the URL's reader, the API's query writer and the count. Any list
 * that narrows entries uses this, so `/ledger` and `/accounts/$ref` cannot drift apart.
 */
export const entryFilterSpec: FilterSpec<EntrySearch, EntryFilters> = {
  empty: noEntryFilters,
  parse: entrySearch,
  toQuery: entryQuery,
  active: filterCount,
}

/** A draft is a URL waiting to happen: drop the empty fields before it becomes one. */
export function entryDraft(values: EntrySearch): EntrySearch {
  return entrySearch(values as Record<string, unknown>)
}
