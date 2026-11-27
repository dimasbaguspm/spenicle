import { formatMoney } from '@/lib/money'

/** Every rendered account field, optional: a nested summary or a partial row still formats. */
type AccountFields = {
  archived?: boolean | undefined
  base_amount_minor?: string | undefined
  currency?: string | undefined
  kind?: string | undefined
  name?: string | undefined
  parent_ref?: string | undefined
}

export const absent = '—'

/** the schema's five kinds and the label a screen shows for each; anything else stays absent. */
const kinds: Record<string, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  expense: 'Expense',
  income: 'Income',
}

/** the base currency's usual two decimals: a screen that knows `minor_units` passes them in. */
export const defaultMinorUnits = 2

export function accountName(account: AccountFields): string {
  return account.name ?? absent
}

export function accountKind(account: AccountFields): string {
  return kinds[account.kind ?? ''] ?? absent
}

export function isArchived(account: AccountFields): boolean {
  return account.archived ?? false
}

export function hasParent(account: AccountFields): boolean {
  return account.parent_ref !== undefined
}

/** minor units on the wire, a grouped decimal on screen, the code only when it was sent. */
export function accountBalance(account: AccountFields, units = defaultMinorUnits): string {
  return formatMoney(account.base_amount_minor ?? '0', units, account.currency ?? '').trim()
}
