import { SlidersHorizontal } from 'lucide-react'

import type { Account, Payee } from '@/api/types'
import { Button } from '@/components/primitives/button'
import { Drawer } from '@/components/primitives/drawer'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DateField, MultiSelectField, QueryForm, TextField } from '@/components/ui/form'
import { accountName, isCategoryKind, isMoneyKind } from '@/modules/account'

import { entryDraft, filterCount, type EntrySearch } from './filters'

type FilterProps = {
  value: EntrySearch
  onApply: (next: EntrySearch) => void
  onClear: () => void
  accounts: readonly Account[]
  payees: readonly Payee[]
}

/** The three controls, as a form: the same provider a record form uses, over a query. */
function FilterFields({ accounts, payees }: Pick<FilterProps, 'accounts' | 'payees'>) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <DateField<EntrySearch> name="from" label="From" />
        <DateField<EntrySearch> name="to" label="To" />
      </div>
      <MultiSelectField<EntrySearch>
        name="account"
        label="Account"
        hint="Where the money sat. Either one of these."
        placeholder="add an account…"
        options={accounts
          .filter((account) => isMoneyKind(account.kind))
          .map((account) => ({ label: accountName(account), value: account.ref }))}
      />
      <MultiSelectField<EntrySearch>
        name="category"
        label="Category"
        hint="What it was for. Either one of these."
        placeholder="add a category…"
        options={accounts
          .filter((account) => isCategoryKind(account.kind))
          .map((account) => ({ label: accountName(account), value: account.ref }))}
      />
      <MultiSelectField<EntrySearch>
        name="payee"
        label="Payee"
        placeholder="add a payee…"
        options={payees.map((payee) => ({ label: payee.name, value: payee.ref }))}
      />
      <TextField<EntrySearch>
        name="q"
        label="Text"
        hint="Matches the note or the payee name."
        placeholder="coffee, rent, taxi…"
      />
    </div>
  )
}

/** The desktop rail: a fifth of the page, applying each change as it happens. */
export function EntryFilterRail({
  value,
  onApply,
  accounts,
  payees,
  total,
}: Omit<FilterProps, 'onClear'> & { total: number }) {
  const active = filterCount(value)

  return (
    <Panel className="space-y-4 p-4 lg:sticky lg:top-4">
      <div className="flex items-baseline justify-between gap-2">
        <Text as="p" tone="section">
          Filter
        </Text>
        <Text as="p" tone="caption" className="text-text-faint">
          {total === 0 ? 'none' : String(total)}
          {active === 0 ? '' : `, ${String(active)} on`}
        </Text>
      </div>

      <QueryForm<EntrySearch>
        key={JSON.stringify(value)}
        values={value}
        onApply={onApply}
        normalize={entryDraft}
        live
      >
        <FilterFields accounts={accounts} payees={payees} />
      </QueryForm>
    </Panel>
  )
}

/**
 * The phone's filter: a button carrying the active count, and a sheet that keeps a draft until
 * Apply, so a half-typed date costs no request.
 */
export function EntryFilterSheet({ value, onApply, onClear, accounts, payees }: FilterProps) {
  const active = filterCount(value)

  return (
    <Drawer
      label="Filter"
      side="bottom"
      closeOnContentClick={false}
      trigger={
        <Button tone="quiet" size="sm" className="gap-2">
          <SlidersHorizontal className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
          Filter
          {active === 0 ? null : (
            <span className="bg-accent text-on-accent rounded-full px-1.5 py-0.5 text-[0.625rem] leading-none font-semibold">
              {active}
            </span>
          )}
        </Button>
      }
    >
      {(close) => (
        <QueryForm<EntrySearch>
          key={JSON.stringify(value)}
          values={value}
          onApply={(next) => {
            onApply(next)
            close()
          }}
          onClear={() => {
            onClear()
            close()
          }}
          normalize={entryDraft}
        >
          <FilterFields accounts={accounts} payees={payees} />
        </QueryForm>
      )}
    </Drawer>
  )
}
