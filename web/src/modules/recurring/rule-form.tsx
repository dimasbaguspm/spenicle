import { Schema } from 'effect'
import type { Resolver } from 'react-hook-form'

import type { RecurringCreate, RecurringPatch } from '@/api/recurring'
import type { Account, Payee, RecurringRule } from '@/api/types'
import { DateField, SelectField, TextField } from '@/components/ui/form'
import { parseMoney } from '@/lib/money'
import { isCategoryKind, isMoneyKind } from '@/modules/account'

export const recurringForm = Schema.Struct({
  payeeRef: Schema.NonEmptyString,
  categoryRef: Schema.String,
  accountRef: Schema.NonEmptyString,
  amount: Schema.NonEmptyString,
  cadence: Schema.NonEmptyString,
  nextDueOn: Schema.String.pipe(Schema.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/))),
})

export type RecurringFormValues = typeof recurringForm.Type

export const recurringResolver: Resolver<RecurringFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(recurringForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

export const cadenceOptions = [
  { label: 'Every month', value: 'monthly' },
  { label: 'Every week', value: 'weekly' },
  { label: 'Every year', value: 'yearly' },
  { label: 'Every day', value: 'daily' },
]

/** The six fields a rule needs, in the order a decision is made. */
export function RecurringFields({
  accounts,
  payees,
}: {
  accounts: readonly Account[]
  payees: readonly Payee[]
}) {
  const categoryOptions = [
    { label: 'No category', value: '' },
    ...accounts
      .filter((account) => isCategoryKind(account.kind))
      .map((account) => ({ label: account.name, value: account.ref })),
  ]

  const accountOptions = accounts
    .filter((account) => isMoneyKind(account.kind))
    .map((account) => ({ label: account.name, value: account.ref }))

  return (
    <>
      <SelectField<RecurringFormValues>
        name="payeeRef"
        label="Paid to"
        options={payees.map((payee) => ({ label: payee.name, value: payee.ref }))}
        placeholder="pick a payee…"
      />
      <SelectField<RecurringFormValues>
        name="categoryRef"
        label="Category"
        options={categoryOptions}
      />
      <SelectField<RecurringFormValues>
        name="accountRef"
        label="Paid from"
        options={accountOptions}
        placeholder="pick an account…"
      />
      <TextField<RecurringFormValues> name="amount" label="Amount" placeholder="0" />
      <SelectField<RecurringFormValues> name="cadence" label="Every" options={cadenceOptions} />
      <DateField<RecurringFormValues>
        name="nextDueOn"
        label="Next due"
        hint="A monthly rule takes its day of the month from this date."
      />
    </>
  )
}

/** The form's values as the create body: minor units, and the day only when the cadence has one. */
export function recurringBody(
  values: RecurringFormValues,
  currency: string,
  units: number,
): RecurringCreate | undefined {
  const amount = parseMoney(values.amount, units)

  if (amount.sign() <= 0) {
    return undefined
  }

  return {
    payee_ref: values.payeeRef,
    account_ref: values.accountRef,
    amount_minor: amount.toMinor(),
    currency,
    cadence: values.cadence,
    next_due_on: values.nextDueOn,
    ...(values.categoryRef === '' ? {} : { category_ref: values.categoryRef }),
    ...(values.cadence === 'monthly'
      ? { day_of_month: Number(values.nextDueOn.slice(8, 10)) }
      : {}),
  }
}

/** What an edit may change: the schedule, never the payee, the account or the category. */
export function recurringPatch(values: RecurringFormValues, units: number): RecurringPatch {
  const amount = parseMoney(values.amount, units)

  return {
    cadence: values.cadence,
    next_due_on: values.nextDueOn,
    ...(amount.sign() > 0 ? { amount_minor: amount.toMinor() } : {}),
    ...(values.cadence === 'monthly'
      ? { day_of_month: Number(values.nextDueOn.slice(8, 10)) }
      : {}),
  }
}

/** The form as an existing rule fills it, so an edit starts where the rule is. */
export function recurringValues(rule: RecurringRule, units: number): RecurringFormValues {
  return {
    payeeRef: rule.payee_ref,
    categoryRef: rule.category_ref ?? '',
    accountRef: rule.account_ref,
    amount: String(Number(rule.amount_minor) / 10 ** units),
    cadence: rule.cadence,
    nextDueOn: rule.next_due_on,
  }
}
