import { Schema } from 'effect'
import { useState } from 'react'
import type { Resolver, UseFormReturn } from 'react-hook-form'

import type { RecurringCreate } from '@/api/recurring'
import type { Account, Payee } from '@/api/types'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DateField, Form, SelectField, TextField } from '@/components/ui/form'
import { useMeta } from '@/hooks/queries/use-meta'
import { useCreateRecurring, usePatchRecurring, useRecurring } from '@/hooks/queries/use-recurring'
import { useMoney } from '@/hooks/use-money'
import { DateFormat, formatDate } from '@/lib/date'
import { parseMoney } from '@/lib/money'
import { isCategoryKind, isMoneyKind, RecurringList, recurringRow } from '@/modules'

const RecurringForm = Schema.Struct({
  payeeRef: Schema.NonEmptyString,
  categoryRef: Schema.String,
  accountRef: Schema.NonEmptyString,
  amount: Schema.NonEmptyString,
  cadence: Schema.NonEmptyString,
  nextDueOn: Schema.String.pipe(Schema.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/))),
})

type RecurringFormValues = typeof RecurringForm.Type

const resolver: Resolver<RecurringFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(RecurringForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

const cadenceOptions = [
  { label: 'Every month', value: 'monthly' },
  { label: 'Every week', value: 'weekly' },
  { label: 'Every year', value: 'yearly' },
  { label: 'Every day', value: 'daily' },
]

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const recurringCrumbs = [{ label: 'Manage', to: '/manage' }, { label: 'Recurring' }] as const

/**
 * What repeats, and when it is next due. A rule never posts an entry: when it comes due the worker
 * queues a capture and approval does the rest, so this page steers the schedule and nothing more.
 */
export function RecurringPage() {
  const rules = useRecurring({ limit: 200 })
  const meta = useMeta()
  const money = useMoney()
  const patch = usePatchRecurring()

  const accounts = meta.data?.accounts ?? []
  const payees = meta.data?.payees ?? []
  const rows = (rules.data?.recurring ?? []).map((rule) =>
    recurringRow(rule, payees, accounts, money.scale),
  )

  return (
    <div className="space-y-6">
      <PageHeader items={recurringCrumbs} title="Recurring" />

      <NewRule accounts={accounts} payees={payees} ready={meta.isSuccess} />

      {rules.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {rules.error.message}
        </Text>
      )}

      {rows.length === 0 ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              {rules.isPending
                ? 'Loading…'
                : 'Nothing repeats yet. A rule needs a payee, an account, an amount and a day.'}
            </Text>
          </div>
        </Panel>
      ) : (
        <Panel>
          <RecurringList
            rows={rows}
            onToggle={(row) => {
              patch.mutate({ ref: row.ref, body: { state: row.running ? 'paused' : 'active' } })
            }}
          />
        </Panel>
      )}

      {patch.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {patch.error.message}
        </Text>
      )}
    </div>
  )
}

/** The rule in, one shape out: a payee, an account, an amount and the schedule that repeats it. */
function NewRule({
  accounts,
  payees,
  ready,
}: {
  accounts: readonly Account[]
  payees: readonly Payee[]
  ready: boolean
}) {
  const money = useMoney()
  const create = useCreateRecurring()
  const [today] = useState(() => formatDate(new Date(), DateFormat.Iso))

  const payeeOptions = payees.map((payee) => ({ label: payee.name, value: payee.ref }))

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
    <Panel>
      <div className="p-5 sm:p-6">
        <PanelHead
          eyebrow="New rule"
          description="A due rule becomes a capture, never an entry. You approve what it was."
        />

        {ready ? (
          <Form<RecurringFormValues>
            className="mt-4"
            defaultValues={{
              payeeRef: payeeOptions[0]?.value ?? '',
              categoryRef: categoryOptions[1]?.value ?? '',
              accountRef: accountOptions[0]?.value ?? '',
              amount: '',
              cadence: 'monthly',
              nextDueOn: today,
            }}
            resolver={resolver}
            submitLabel="Save rule"
            onSubmit={(values) => {
              const body = ruleBody(values, money.scale.currency, money.scale.units)

              if (body === undefined) {
                return
              }

              create.mutate(body)
            }}
          >
            {(form) => (
              <>
                <SelectField<RecurringFormValues>
                  name="payeeRef"
                  label="Paid to"
                  options={payeeOptions}
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
                <SelectField<RecurringFormValues>
                  name="cadence"
                  label="Every"
                  options={cadenceOptions}
                />
                <NextDueField form={form} />
              </>
            )}
          </Form>
        ) : (
          <Text as="p" tone="muted" className="mt-3">
            Loading the payees and accounts to pick from…
          </Text>
        )}

        {create.error === null ? null : (
          <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
            {create.error.message}
          </Text>
        )}
      </div>
    </Panel>
  )
}

/** A monthly rule takes its day of the month from the due date, so the form asks for one and not two. */
function NextDueField({ form }: { form: UseFormReturn<RecurringFormValues> }) {
  return (
    <DateField<RecurringFormValues>
      name="nextDueOn"
      label="Next due"
      hint={
        form.watch('cadence') === 'monthly'
          ? 'The day of the month comes from this date.'
          : undefined
      }
    />
  )
}

/** The amount is what leaves the account: a zero is not a rule, and the wire wants minor units. */
function ruleBody(
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
