import type { Account, Payee } from '@/api/types'
import { DateFormat, formatDate } from '@/lib/date'
import { formatMoney, type MoneyScale } from '@/lib/money'
import { absent } from '@/lib/text'

/**
 * The fields a rule row reads. `category_ref`, `day_of_month` and `ends_on` are omitted from the
 * wire type when a rule leaves them unset, so a row treats them as optional.
 */
export type RecurringLike = {
  ref: string
  payee_ref: string
  account_ref: string
  amount_minor: string
  currency: string
  cadence: string
  next_due_on: string
  state: string
  category_ref?: string | undefined
  interval_n?: number | undefined
  day_of_month?: number | undefined
  business_day_shift?: string | undefined
}

/** One rule as a row renders it: who it pays, how often, when it is next due, and whether it runs. */
export type RecurringRow = {
  ref: string
  title: string
  caption: string
  amount: string
  schedule: string
  nextDue: string
  state: string
  tone: string
  running: boolean
}

const muted = 'text-text-muted'

/** state decides the colour; one the API adds later stays muted instead of unstyled. */
const tones: Record<string, string> = {
  active: 'text-success',
  paused: 'text-warning',
  suggested: 'text-info',
  ended: 'text-text-faint',
}

const cadences: Record<string, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
}

const shifts: Record<string, string> = {
  none: '',
  next: ', the next business day',
  prev: ', the previous business day',
}

/** `Every month on day 20, the next business day`, or as little as the cadence alone. */
function scheduleOf(rule: RecurringLike): string {
  const base = cadences[rule.cadence] ?? rule.cadence
  const shift = shifts[rule.business_day_shift ?? 'none'] ?? ''

  if (rule.cadence === 'monthly' && rule.day_of_month !== undefined) {
    return `${base} on day ${String(rule.day_of_month)}${shift}`
  }

  if (rule.cadence === 'weekly' && rule.interval_n !== undefined && rule.interval_n > 1) {
    return `${base}, every ${String(rule.interval_n)} weeks`
  }

  return base
}

/** the payee names the rule; the category and the account say where it lands */
function captionOf(
  payee: Payee | undefined,
  category: Account | undefined,
  account: Account | undefined,
): string {
  return [
    payee === undefined ? 'nobody in particular' : (category?.name ?? 'uncategorised'),
    account?.name ?? absent,
  ].join(' - ')
}
export function recurringRow(
  rule: RecurringLike,
  payees: readonly Payee[],
  accounts: readonly Account[],
  scale: MoneyScale,
): RecurringRow {
  const payee = payees.find((row) => row.ref === rule.payee_ref)
  const category = accounts.find((row) => row.ref === rule.category_ref)
  const account = accounts.find((row) => row.ref === rule.account_ref)

  return {
    ref: rule.ref,
    title: payee?.name ?? 'recurring rule',
    caption: captionOf(payee, category, account),
    amount: formatMoney(rule.amount_minor, scale.units).toDisplay(rule.currency),
    schedule: scheduleOf(rule),
    nextDue: formatDate(rule.next_due_on, DateFormat.Iso),
    state: rule.state === '' ? absent : rule.state,
    tone: tones[rule.state] ?? muted,
    running: rule.state === 'active',
  }
}
