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

export type FormattedAccount = {
  name: string
  kind: string
  balance: string
  isArchived: boolean
  hasParent: boolean
}

const absent = '—'

/** the schema's five kinds and the label a screen shows for each; anything else stays absent. */
const kinds: Record<string, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  expense: 'Expense',
  income: 'Income',
}

/** the base currency's usual two decimals: a screen that knows `minor_units` passes them in. */
const defaultMinorUnits = 2

/**
 * One call answers every question an account row asks. Minor units on the wire, a grouped
 * decimal on screen, the code only when it was sent.
 */
export function formatAccountData(
  account: AccountFields,
  units = defaultMinorUnits,
): FormattedAccount {
  return {
    name: account.name ?? absent,
    kind: kinds[account.kind ?? ''] ?? absent,
    balance: formatMoney(account.base_amount_minor ?? '0', units, account.currency ?? '').trim(),
    isArchived: account.archived ?? false,
    hasParent: account.parent_ref !== undefined,
  }
}
