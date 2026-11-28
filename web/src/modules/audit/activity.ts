import type { Account, AuditRow } from '@/api/types'
import { DateFormat, formatDate } from '@/lib/date'

/** The five ref-carrying pages an activity line can jump to; each one is `/…/$ref`. */
type EntityTo =
  | '/ledger/$ref'
  | '/manage/accounts/$ref'
  | '/manage/categories/$ref'
  | '/manage/payees/$ref'
  | '/manage/rules/$ref'
  | '/manage/recurring/$ref'

type PlainTo = '/settings/tokens' | '/settings/intake' | '/settings'

export type ActivityRow = {
  ref: string
  when: string
  actor: string
  action: string
  entity: string
  /** where the row points, when the entity still has a page */
  to?: EntityTo | undefined
  plainTo?: PlainTo | undefined
  targetRef?: string | undefined
}

const actions: Record<string, string> = {
  create: 'logged',
  update: 'edited',
  reverse: 'reversed',
  approve: 'approved',
  reject: 'rejected',
  revoke: 'revoked',
  start: 'started',
}

const words: Record<string, string> = {
  ledger_entry: 'entry',
  account: 'account',
  payee: 'payee',
  categorization_rule: 'rule',
  api_token: 'token',
  setting: 'setting',
  system: 'system',
}

/** A category is an account, so the kind decides which of the two pages owns it. */
function accountTo(accounts: readonly Account[], ref: string): EntityTo {
  const kind = accounts.find((account) => account.ref === ref)?.kind

  return kind === 'expense' || kind === 'income'
    ? '/manage/categories/$ref'
    : '/manage/accounts/$ref'
}

/**
 * One journal line as the activity log reads it: what happened, to what, who did it and when, with
 * the way through to the entity itself rather than a hash a person has to paste somewhere.
 */
export function activityRow(row: AuditRow, accounts: readonly Account[]): ActivityRow {
  const kind = row.entity_kind
  const entity = words[kind] ?? kind.replace('_', ' ')
  const base = {
    ref: row.ref,
    when: formatDate(row.at, DateFormat.Timestamp),
    actor: row.actor_kind === 'worker' ? 'the worker' : 'you',
    action: actions[row.action] ?? row.action,
    entity,
    targetRef: row.entity_ref,
  }

  switch (kind) {
    case 'ledger_entry':
      return { ...base, to: '/ledger/$ref' }
    case 'account':
      return { ...base, to: accountTo(accounts, row.entity_ref) }
    case 'payee':
      return { ...base, to: '/manage/payees/$ref' }
    case 'categorization_rule':
      return { ...base, to: '/manage/rules/$ref' }
    case 'recurring_rule':
      return { ...base, to: '/manage/recurring/$ref' }
    case 'api_token':
      return { ...base, plainTo: '/settings/tokens' }
    case 'setting':
      return { ...base, plainTo: '/settings' }
    default:
      return base
  }
}
