import { useEntryPages } from '@/hooks/queries/use-entries'
import { useFilterQuery } from '@/hooks/use-filter-query'
import {
  entryFilterSpec,
  type EntryMovementView,
  type EntrySearch,
  type MovementsMode,
} from '@/modules'

const limit = 100

/**
 * The filter layer and the paged read, in one place: a detail screen is a question ("what left this
 * account last month?", "what did I pay this shop?") and the URL is where that question lives, so
 * the rail, the sheet, the chips and the paging are the register's, not a second copy of them.
 */
export function useEntryMovements({
  search,
  onChange,
  pinned,
  mode,
}: {
  search: EntrySearch
  onChange: (next: EntrySearch) => void
  /** the ref the page is about: a filter may narrow it, never unsay it */
  pinned: EntrySearch
  mode: MovementsMode
}): EntryMovementView {
  const filters = useFilterQuery({ search, onChange, spec: entryFilterSpec, limit, pinned })

  // a running balance is only meaningful for exactly one account, so a payee page has none
  const entries = useEntryPages(
    mode === 'payee' ? filters.query : { ...filters.query, with_balance: 'true' },
  )

  return {
    value: filters.value,
    onApply: filters.apply,
    onClear: filters.clear,
    rows: entries.data?.pages.flatMap((page) => page.entries) ?? [],
    pending: entries.isPending,
    settled: entries.isSuccess,
    error: entries.error?.message,
    hasNext: entries.hasNextPage,
    fetchingNext: entries.isFetchingNextPage,
    onMore: () => {
      void entries.fetchNextPage()
    },
  }
}
