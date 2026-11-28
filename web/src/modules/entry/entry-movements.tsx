import type { Account, Entry, Payee } from '@/api/types'
import { BreakpointDesktop, BreakpointTablet } from '@/components/primitives/breakpoint'
import { Button } from '@/components/primitives/button'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import type { MoneyScale } from '@/lib/money'
import type { AccountIndex } from '@/modules/account'

import { AccountRegister } from './account-register'
import { EntryFilterChips } from './entry-filter-chips'
import { EntryFilterRail, EntryFilterSheet } from './entry-filters'
import { EntryRegister } from './entry-register'
import type { EntrySearch } from './filters'

/** What the rows mean: an account's balance, a category's filing, or a payee's history. */
export type MovementsMode = 'account' | 'category' | 'payee'

/** Everything `useEntryMovements` derives, handed over so this file stays a drawing. */
export type EntryMovementView = {
  value: EntrySearch
  onApply: (next: EntrySearch) => void
  onClear: () => void
  rows: readonly Entry[]
  pending: boolean
  settled: boolean
  error: string | undefined
  hasNext: boolean
  fetchingNext: boolean
  onMore: () => void
}

/**
 * One page's slice of the ledger, drawn with the register's own controls. The rail is the desk's
 * fifth of the page and the sheet is the phone's; neither knows what the page is about, because the
 * pinned ref arrives already inside `value`.
 */
export function EntryMovements({
  view,
  mode,
  accounts,
  payees,
  index,
  scale,
}: {
  view: EntryMovementView
  mode: MovementsMode
  accounts: readonly Account[]
  payees: readonly Payee[]
  index: AccountIndex
  scale: MoneyScale
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[20%_minmax(0,1fr)]">
      <BreakpointDesktop>
        <aside>
          <EntryFilterRail
            value={view.value}
            onApply={view.onApply}
            accounts={accounts}
            payees={payees}
            total={view.rows.length}
          />
        </aside>
      </BreakpointDesktop>

      <div className="min-w-0 space-y-4">
        <BreakpointTablet>
          <div className="flex items-center justify-between gap-3">
            <EntryFilterSheet
              value={view.value}
              onApply={view.onApply}
              onClear={view.onClear}
              accounts={accounts}
              payees={payees}
            />
            <Text as="p" tone="caption" className="text-text-faint">
              {view.rows.length === 0 ? 'nothing matched' : `${String(view.rows.length)} movements`}
            </Text>
          </div>
        </BreakpointTablet>

        <EntryFilterChips
          value={view.value}
          accounts={accounts}
          payees={payees}
          onDismiss={(key) => {
            view.onApply({ ...view.value, [key]: undefined })
          }}
          onClearAll={view.onClear}
        />

        {view.error === undefined ? null : (
          <Text as="p" tone="caption" className="text-danger" role="alert">
            {view.error}
          </Text>
        )}

        <Panel>
          {view.pending ? (
            <div className="space-y-3 p-5 sm:p-6" aria-hidden="true">
              <div className="bg-surface-raised/60 h-3 w-1/3 animate-pulse rounded" />
              <div className="bg-surface-raised/60 h-3 w-2/3 animate-pulse rounded" />
            </div>
          ) : null}

          {view.rows.length === 0 && view.settled ? (
            <Text as="p" tone="muted" className="p-5 sm:p-6">
              Nothing in this window.
            </Text>
          ) : null}

          {view.rows.length === 0 ? null : mode === 'payee' ? (
            <EntryRegister entries={view.rows} accounts={index} scale={scale} />
          ) : (
            <AccountRegister
              entries={view.rows}
              accounts={index}
              scale={scale}
              hideCategory={mode === 'category'}
            />
          )}

          {view.hasNext ? (
            <div className="border-border flex justify-center border-t p-4">
              <Button tone="quiet" size="sm" loading={view.fetchingNext} onClick={view.onMore}>
                Load more
              </Button>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  )
}
