import type { Account } from '@/api/types'
import { absent } from '@/lib/text'

/** The five kinds the schema knows, in the order accounting reads them. */
export const accountGroups = [
  { kind: 'asset', label: 'Assets' },
  { kind: 'liability', label: 'Liabilities' },
  { kind: 'equity', label: 'Equity' },
  { kind: 'expense', label: 'Expense categories' },
  { kind: 'income', label: 'Income categories' },
] as const

/** A posting is money only on an asset or a liability; every other side is the category. */
export function isMoneyKind(kind: string | undefined): boolean {
  return kind === 'asset' || kind === 'liability'
}

export function isCategoryKind(kind: string | undefined): boolean {
  return kind === 'expense' || kind === 'income'
}

/** ref → row, so a register line can read a posting's account without a second fetch. */
export type AccountIndex = Map<string, Account>

export function accountIndex(accounts: readonly Account[]): AccountIndex {
  return new Map(accounts.map((account) => [account.ref, account]))
}

export function accountName(account: Account | undefined): string {
  return account?.name === undefined || account.name === '' ? absent : account.name
}
