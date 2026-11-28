import { Schema } from 'effect'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'

import { Button } from '@/components/primitives/button'
import { DateInput } from '@/components/primitives/date-input'
import { Field } from '@/components/primitives/field'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useCreateEntry, useEntries } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { parseMoney } from '@/lib/money'
import {
  accountIndex,
  emptyEntryForm,
  EntryForm,
  EntryRegister,
  isCategoryKind,
  isMoneyKind,
  type EntryFormValues,
} from '@/modules'

const listLimit = 50

/**
 * react-hook-form owns the field state; the Effect schema owns the rules. One parse
 * on submit answers both "is this valid" and "what is its type", so the form and the
 * API can never disagree about what an amount or a day looks like.
 */
const resolver: Resolver<EntryFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(EntryForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

export function LedgerPage() {
  const meta = useMeta()
  const entries = useEntries({ limit: listLimit })
  const money = useMoney()

  const form = useForm<EntryFormValues>({ resolver, defaultValues: emptyEntryForm() })

  const accounts = useMemo(() => meta.data?.accounts ?? [], [meta.data])
  const index = useMemo(() => accountIndex(accounts), [accounts])

  const categoryOptions = useMemo(
    () =>
      accounts
        .filter((row) => isCategoryKind(row.kind))
        .map((row) => ({ label: row.name, value: row.ref })),
    [accounts],
  )

  const accountOptions = useMemo(
    () =>
      accounts
        .filter((row) => isMoneyKind(row.kind))
        .map((row) => ({ label: row.name, value: row.ref })),
    [accounts],
  )

  // a fresh instance has a default asset and category: preselect them, once
  useEffect(() => {
    const firstCategory = categoryOptions[0]
    const firstAccount = accountOptions[0]

    if (firstCategory !== undefined && form.getValues('categoryRef') === '') {
      form.setValue('categoryRef', firstCategory.value)
    }

    if (firstAccount !== undefined && form.getValues('accountRef') === '') {
      form.setValue('accountRef', firstAccount.value)
    }
  }, [accountOptions, categoryOptions, form])

  const post = useCreateEntry()

  const submit = form.handleSubmit((values) => {
    const amount = parseMoney(values.amount, money.scale.units)

    if (amount.sign() === 0) {
      form.setError('root', { type: 'validate', message: 'enter an amount' })
      return
    }

    post.mutate(
      {
        occurred_on: values.occurredOn,
        currency: money.scale.currency,
        note: values.note,
        postings: [
          { account_ref: values.categoryRef, amount_minor: amount.toMinor() },
          { account_ref: values.accountRef, amount_minor: amount.negate().toMinor() },
        ],
      },
      {
        onSuccess: () => {
          form.resetField('amount')
          form.resetField('note')
        },
      },
    )
  })

  const errors = form.formState.errors
  const rows = useMemo(() => entries.data?.entries ?? [], [entries.data])
  const count = rows.length

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-prose space-y-2.5">
          <Text as="p" tone="section">
            The ledger
          </Text>
          <Text as="h1" tone="display">
            Register
          </Text>
          <Text as="p" tone="muted">
            Money in and out, newest first. Capture first, organize later — nothing sorts itself.
          </Text>
        </div>
        <Text as="p" tone="figure" className="text-ink-400 text-xs sm:pb-1">
          {count === 0 ? 'no entries' : `${String(count)} entries`} · {money.scale.currency}
        </Text>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel className="lg:col-span-5 lg:self-start">
          <form className="space-y-5 p-5 sm:p-6" onSubmit={submit}>
            <PanelHead
              eyebrow="Quick capture"
              description="Amount, what it was, and where it came from. Two seconds."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Amount" error={errors.amount?.message} className="sm:col-span-2">
                <div className="relative">
                  <TextInput
                    inputMode="decimal"
                    placeholder="0"
                    autoComplete="off"
                    className="h-14 pr-14 font-mono text-2xl tracking-tight"
                    {...form.register('amount')}
                  />
                  <span className="text-ink-400 pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-[0.6875rem] uppercase">
                    {money.scale.currency}
                  </span>
                </div>
              </Field>

              <Field label="What was it" error={errors.note?.message} className="sm:col-span-2">
                <TextInput
                  placeholder="coffee, taxi, rent…"
                  autoComplete="off"
                  {...form.register('note')}
                />
              </Field>

              <Field label="Day" error={errors.occurredOn?.message}>
                <DateInput {...form.register('occurredOn')} />
              </Field>

              <Controller
                control={form.control}
                name="categoryRef"
                render={({ field, fieldState }) => (
                  <Field label="Category" error={fieldState.error?.message}>
                    <SelectInput
                      value={field.value}
                      options={categoryOptions}
                      placeholder="pick a category…"
                      onChange={field.onChange}
                    />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="accountRef"
                render={({ field, fieldState }) => (
                  <Field
                    label="Paid from"
                    error={fieldState.error?.message}
                    className="sm:col-span-2"
                  >
                    <SelectInput
                      value={field.value}
                      options={accountOptions}
                      placeholder="pick an account…"
                      onChange={field.onChange}
                    />
                  </Field>
                )}
              />
            </div>

            <div className="space-y-3 pt-1">
              <Button type="submit" size="lg" block loading={post.isPending}>
                {post.isPending ? 'Posting…' : 'Post entry'}
              </Button>
              {errors.root === undefined ? null : (
                <Text as="p" tone="caption" className="text-oxblood-300" role="alert">
                  {errors.root.message}
                </Text>
              )}
              {post.error === null ? null : (
                <Text as="p" tone="caption" className="text-oxblood-300" role="alert">
                  {post.error.message}
                </Text>
              )}
            </div>
          </form>
        </Panel>

        <Panel className="lg:col-span-7 lg:self-start">
          <div className="p-5 pb-3 sm:p-6 sm:pb-3">
            <PanelHead eyebrow="Register" title={count === 0 ? 'Nothing yet' : undefined} />
          </div>

          {count === 0 ? (
            <div className="text-ink-400 space-y-2 px-5 pb-6 sm:px-6">
              <Text as="p" tone="muted" className="max-w-prose">
                Post the first one on the left, or capture something now and decide later. Nothing
                is organized for you, on purpose.
              </Text>
            </div>
          ) : null}

          {entries.isPending ? (
            <div className="space-y-3 px-5 pb-6 sm:px-6" aria-hidden="true">
              <div className="bg-ink-800/60 h-3 w-1/3 animate-pulse rounded" />
              <div className="bg-ink-800/60 h-3 w-2/3 animate-pulse rounded" />
              <div className="bg-ink-800/60 h-3 w-1/2 animate-pulse rounded" />
            </div>
          ) : null}

          {entries.error === null ? null : (
            <Text as="p" tone="caption" className="text-oxblood-300 px-5 pb-6 sm:px-6" role="alert">
              {entries.error.message}
            </Text>
          )}

          {count === 0 ? null : (
            <EntryRegister entries={rows} accounts={index} scale={money.scale} />
          )}
        </Panel>
      </div>
    </div>
  )
}
