import type { Entry } from '@/api/types'
import { DateFormat, formatDate } from '@/lib/date'
import { formatMoney, type MoneyScale } from '@/lib/money'
import { absent } from '@/lib/text'
import { accountName, isCategoryKind, isMoneyKind, type AccountIndex } from '@/modules/account'

/** One entry, already answered: the day, the label, the category and the signed figure. */
export type EntryRow = {
  ref: string
  iso: string
  day: string
  title: string
  category: string
  amount: string
  outgoing: boolean
  isReversed: boolean
}

/** the payee is what a reader recognises, the note is why: one line holds both when it has them. */
function entryTitle(entry: Entry): string {
  const payee = entry.payee?.name
  const note = entry.note === undefined || entry.note === '' ? undefined : entry.note

  if (payee === undefined || payee === '') {
    return note ?? absent
  }

  return note === undefined ? payee : `${payee} · ${note}`
}

/**
 * One call answers every question a register line asks. Reading the sign off the money side is
 * what keeps an expense negative, so no screen compares a field to decide how a row looks.
 */
export function entryRow(entry: Entry, accounts: AccountIndex, scale: MoneyScale): EntryRow {
  const postings = entry.postings ?? []
  const moneySide = postings.find((posting) => isMoneyKind(accounts.get(posting.account_ref)?.kind))
  const categorySide = postings.find((posting) =>
    isCategoryKind(accounts.get(posting.account_ref)?.kind),
  )
  const shown = moneySide ?? postings[0]
  const figure = formatMoney(shown?.amount_minor ?? '0', scale.units)

  return {
    ref: entry.ref,
    iso: entry.occurred_on,
    day: formatDate(entry.occurred_on, DateFormat.Day),
    title: entryTitle(entry),
    category: accountName(accounts.get(categorySide?.account_ref ?? '')),
    amount: figure.absolute().toDisplay(),
    outgoing: figure.isNegative(),
    isReversed: entry.reversed_at !== undefined,
  }
}
