import { useMutation, useQuery } from '@tanstack/react-query'
import { Schema } from 'effect'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'

import { api, errorMessage } from '@/api/client'
import { queryClient } from '@/api/query'
import { Button } from '@/components/primitives/button'
import { DateInput } from '@/components/primitives/date-input'
import { Field } from '@/components/primitives/field'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { CaptureForm, today, type CaptureValues } from '@/lib/capture'
import { formatDay } from '@/lib/format'
import { formatMoney, toMinor } from '@/lib/money'

const listLimit = 50

/**
 * react-hook-form owns the field state; the Effect schema owns the rules. One parse
 * on submit answers both "is this valid" and "what is its type", so the form and the
 * API can never disagree about what an amount or a day looks like.
 */
const resolver: Resolver<CaptureValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(CaptureForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

async function fetchMeta() {
  const { data, error, response } = await api.GET('/api/meta')
  if (error !== undefined) {
    throw new Error(errorMessage(error, response.status))
  }

  return data
}

async function fetchEntries() {
  const { data, error, response } = await api.GET('/api/entries', {
    params: { query: { limit: listLimit } },
  })
  if (error !== undefined) {
    throw new Error(errorMessage(error, response.status))
  }

  return data
}

export function LedgerPage() {
  const meta = useQuery({ queryKey: ['meta'], queryFn: fetchMeta })
  const entries = useQuery({ queryKey: ['entries'], queryFn: fetchEntries })

  const form = useForm<CaptureValues>({
    resolver,
    defaultValues: {
      amount: '',
      note: '',
      occurredOn: today(),
      categoryRef: '',
      accountRef: '',
    },
  })

  const accounts = useMemo(() => meta.data?.accounts ?? [], [meta.data])
  const baseCurrency = meta.data?.settings?.base_currency ?? 'USD'
  const units =
    (meta.data?.currencies ?? []).find((row) => row.code === baseCurrency)?.minor_units ?? 2

  const categoryOptions = useMemo(
    () =>
      accounts
        .filter((row) => row.kind === 'expense' || row.kind === 'income')
        .map((row) => ({ label: row.name ?? '—', value: row.ref ?? '' }))
        .filter((option) => option.value !== ''),
    [accounts],
  )

  const accountOptions = useMemo(
    () =>
      accounts
        .filter((row) => row.kind === 'asset' || row.kind === 'liability')
        .map((row) => ({ label: row.name ?? '—', value: row.ref ?? '' }))
        .filter((option) => option.value !== ''),
    [accounts],
  )

  const names = useMemo(
    () => new Map(accounts.map((row) => [row.ref ?? '', row.name ?? ''])),
    [accounts],
  )

  // a posting is money only if it lands on an asset or a liability; the other side is
  // the category. Reading the sign off the money side is what keeps an expense negative.
  const kinds = useMemo(
    () => new Map(accounts.map((row) => [row.ref ?? '', row.kind ?? ''])),
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

  const post = useMutation({
    mutationFn: async (values: CaptureValues) => {
      const minor = toMinor(values.amount, units)
      if (minor === '0') {
        throw new Error('enter an amount')
      }

      const { error, response } = await api.POST('/api/entries', {
        body: {
          occurred_on: values.occurredOn,
          currency: baseCurrency,
          note: values.note,
          postings: [
            { account_ref: values.categoryRef, amount_minor: minor },
            {
              account_ref: values.accountRef,
              amount_minor: minor.startsWith('-') ? minor.slice(1) : `-${minor}`,
            },
          ],
        },
      })

      if (error !== undefined) {
        throw new Error(errorMessage(error, response.status))
      }
    },
    onSuccess: async () => {
      form.resetField('amount')
      form.resetField('note')
      await queryClient.invalidateQueries({ queryKey: ['entries'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
  })

  const submit = form.handleSubmit((values) => {
    post.mutate(values)
  })

  const errors = form.formState.errors

  const rows = entries.data?.entries ?? []
  const count = rows.length

  return (
    <div className="space-y-8">
      <header className="border-ink-800/70 flex flex-wrap items-end justify-between gap-4 border-b pb-7">
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
          {count === 0 ? 'no entries' : `${count} entries`} · {baseCurrency}
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
                    {baseCurrency}
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
            <>
              <div className="text-ink-500 border-ink-800/80 font-mono hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] font-medium tracking-[0.16em] uppercase sm:flex">
                <span className="w-[5.5rem] shrink-0">Day</span>
                <span className="min-w-0 flex-1">Entry</span>
                <span className="w-20 shrink-0">Category</span>
                <span className="w-28 shrink-0 text-right">Amount · {baseCurrency}</span>
              </div>
              <ul>
                {rows.map((entry) => {
                  const postings = entry.postings ?? []
                  const money = postings.find((row) =>
                    ['asset', 'liability'].includes(kinds.get(row.account_ref ?? '') ?? ''),
                  )
                  const category = postings.find((row) =>
                    ['expense', 'income'].includes(kinds.get(row.account_ref ?? '') ?? ''),
                  )
                  const shown = money ?? postings[0]
                  const label =
                    entry.note === undefined || entry.note === ''
                      ? (entry.payee?.name ?? '—')
                      : entry.note
                  const minor = shown?.amount_minor ?? '0'
                  const outgoing = minor.startsWith('-')
                  const amount = formatMoney(
                    outgoing ? minor.slice(1) : minor,
                    units,
                    entry.currency ?? baseCurrency,
                    false,
                  )

                  return (
                    <li
                      key={entry.ref}
                      className="border-ink-800/80 hover:bg-ink-800/40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-t px-4 py-3.5 text-sm transition-colors first:border-t-0 sm:grid-cols-[5.5rem_minmax(0,1fr)_5rem_7rem] sm:px-6"
                    >
                      <Text
                        as="span"
                        tone="figure"
                        className="text-ink-400 order-3 text-xs sm:order-none"
                      >
                        <time dateTime={entry.occurred_on ?? ''} title={entry.occurred_on}>
                          {formatDay(entry.occurred_on ?? '')}
                        </time>
                      </Text>
                      <span
                        className="text-porcelain-100 order-1 min-w-0 truncate sm:order-none"
                        title={label}
                      >
                        {label}
                      </span>
                      <Text
                        as="span"
                        tone="caption"
                        className="text-ink-400 order-4 hidden min-w-0 truncate sm:order-none sm:block"
                      >
                        {names.get(category?.account_ref ?? '') ?? ''}
                      </Text>
                      <Text
                        as="span"
                        tone="figure"
                        className={`order-2 text-right sm:order-none ${outgoing ? 'text-porcelain-200' : 'text-jade-300'}`}
                      >
                        {outgoing ? `−${amount}` : `+${amount}`}
                      </Text>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </Panel>
      </div>
    </div>
  )
}
