import type { Account, Payee } from '@/api/types'
import { absent } from '@/lib/text'

/** A payee as a screen reads it: its name and the two defaults, already resolved to words. */
export type PayeeRow = {
  ref: string
  name: string
  archived: boolean
  account: string
  category: string
}

function nameOf(names: Map<string, string>, ref: string | undefined): string {
  if (ref === undefined) {
    return absent
  }

  return names.get(ref) ?? absent
}

/** One pass over the account list, so a page of payees does not walk it once per row. */
export function payeeRows(payees: readonly Payee[], accounts: readonly Account[]): PayeeRow[] {
  const names = new Map(accounts.map((account) => [account.ref, account.name]))

  return payees.map((payee) => ({
    ref: payee.ref,
    name: payee.name,
    archived: payee.archived,
    account: nameOf(names, payee.default_account_ref),
    category: nameOf(names, payee.default_category_ref),
  }))
}

/** What a row says under the name: the defaults it would fill in, or the fact that it has none. */
export function payeeCaption(row: PayeeRow): string {
  const parts = [
    row.account === absent ? undefined : `paid from ${row.account}`,
    row.category === absent ? undefined : `in ${row.category}`,
  ].filter((part) => part !== undefined)

  return parts.length === 0 ? 'no defaults' : parts.join('; ')
}
