import type { Account } from '@/api/types'
import { absent } from '@/lib/text'

/** One heading in a grouped balance list. */
export type AccountGroup = { readonly kind: string; readonly label: string }

/** The kinds that hold money, in the order a balance sheet reads them. */
export const moneyGroups: readonly AccountGroup[] = [
  { kind: 'asset', label: 'Assets' },
  { kind: 'liability', label: 'Liabilities' },
  { kind: 'equity', label: 'Equity' },
]

/** The kinds that name what money was for. A category is an account with no money in it. */
export const categoryGroups: readonly AccountGroup[] = [
  { kind: 'expense', label: 'Expense' },
  { kind: 'income', label: 'Income' },
]

/** Both screens together: what a picker or a roll-up still needs. */
export const accountGroups: readonly AccountGroup[] = [...moneyGroups, ...categoryGroups]

/** A posting is money only on an asset or a liability; every other side is the category. */
export function isMoneyKind(kind: string | undefined): boolean {
  return kind === 'asset' || kind === 'liability'
}

export function isCategoryKind(kind: string | undefined): boolean {
  return kind === 'expense' || kind === 'income'
}

/** Which screen an account belongs to; equity is money, because it is a side of the balance sheet. */
export type AccountScope = 'money' | 'category'

export function accountScope(kind: string | undefined): AccountScope {
  return isCategoryKind(kind) ? 'category' : 'money'
}

/** What a create form offers: only the kinds of the scope the screen belongs to. */
export function kindOptions(scope: AccountScope): { label: string; value: string }[] {
  return scope === 'category'
    ? [
        { label: 'Expense category', value: 'expense' },
        { label: 'Income category', value: 'income' },
      ]
    : [
        { label: 'Asset', value: 'asset' },
        { label: 'Liability', value: 'liability' },
        { label: 'Equity', value: 'equity' },
      ]
}

/** The first kind of a scope, so a form opens on something valid instead of an empty picker. */
export function defaultKind(scope: AccountScope): string {
  return scope === 'category' ? 'expense' : 'asset'
}
/** ref → row, so a register line can read a posting's account without a second fetch. */
export type AccountIndex = Map<string, Account>

export function accountIndex(accounts: readonly Account[]): AccountIndex {
  return new Map(accounts.map((account) => [account.ref, account]))
}

export function accountName(account: Account | undefined): string {
  return account?.name === undefined || account.name === '' ? absent : account.name
}
