import { X } from 'lucide-react'

import type { Account, Payee } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { accountName } from '@/modules/account'

import { filterCount, type EntrySearch } from './filters'

type Chip = {
  key: keyof EntrySearch
  label: string
}

/** The applied filter, said out loud: each chip is one field, and it can be taken back. */
function chipsOf(
  value: EntrySearch,
  accounts: readonly Account[],
  payees: readonly Payee[],
): Chip[] {
  const chips: Chip[] = []

  if (value.from !== undefined) {
    chips.push({ key: 'from', label: `From ${value.from}` })
  }

  if (value.to !== undefined) {
    chips.push({ key: 'to', label: `To ${value.to}` })
  }

  if (value.account !== undefined) {
    const account = accounts.find((row) => row.ref === value.account)
    chips.push({ key: 'account', label: accountName(account) })
  }

  if (value.payee !== undefined) {
    const payee = payees.find((row) => row.ref === value.payee)
    chips.push({ key: 'payee', label: payee?.name ?? 'payee' })
  }

  if (value.q !== undefined) {
    chips.push({ key: 'q', label: `"${value.q}"` })
  }

  return chips
}

export function EntryFilterChips({
  value,
  accounts,
  payees,
  onDismiss,
  onClearAll,
}: {
  value: EntrySearch
  accounts: readonly Account[]
  payees: readonly Payee[]
  onDismiss: (key: keyof EntrySearch) => void
  onClearAll: () => void
}) {
  const chips = chipsOf(value, accounts, payees)

  if (filterCount(value) === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => {
            onDismiss(chip.key)
          }}
          className="border-border text-text-muted hover:border-border-strong hover:text-text inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors"
        >
          {chip.label}
          <X className="size-3" aria-hidden="true" strokeWidth={2} />
        </button>
      ))}
      <Text as="span" tone="caption" className="text-text-faint ml-1">
        {chips.length === 1 ? '1 filter' : `${String(chips.length)} filters`}
      </Text>
      <button
        type="button"
        onClick={onClearAll}
        className="text-text-faint hover:text-danger ml-auto text-xs underline underline-offset-4"
      >
        Remove all
      </button>
    </div>
  )
}
