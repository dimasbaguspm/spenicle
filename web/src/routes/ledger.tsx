import { useMutation, useQuery } from '@tanstack/react-query'
import { Schema } from 'effect'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'

import { api, errorMessage } from '@/api/client'
import { queryClient } from '@/api/query'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { CaptureForm, today, type CaptureValues } from '@/lib/capture'
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

  return (
    <div className="space-y-10">
      <form
        className="border-border bg-surface-raised space-y-4 rounded-lg border p-5"
        onSubmit={submit}
      >
        <h2 className="text-brass-500 text-xs font-medium tracking-[0.14em] uppercase">
          Quick capture
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[9rem_1fr_11rem]">
          <Field label="Amount" error={errors.amount?.message}>
            <Input
              inputMode="decimal"
              placeholder={baseCurrency}
              autoComplete="off"
              {...form.register('amount')}
            />
          </Field>
          <Field label="What was it" error={errors.note?.message}>
            <Input placeholder="coffee, taxi, rent…" {...form.register('note')} />
          </Field>
          <Field label="Day" error={errors.occurredOn?.message}>
            <Input type="date" {...form.register('occurredOn')} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="categoryRef"
            render={({ field, fieldState }) => (
              <Field label="Category" error={fieldState.error?.message}>
                <Select
                  value={field.value}
                  options={categoryOptions}
                  placeholder="pick a category"
                  onChange={field.onChange}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="accountRef"
            render={({ field, fieldState }) => (
              <Field label="Paid from" error={fieldState.error?.message}>
                <Select
                  value={field.value}
                  options={accountOptions}
                  placeholder="pick an account"
                  onChange={field.onChange}
                />
              </Field>
            )}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={post.isPending}>
            {post.isPending ? 'Posting…' : 'Post entry'}
          </Button>
          {errors.root === undefined ? null : (
            <p role="alert" className="text-danger text-sm">
              {errors.root.message}
            </p>
          )}
          {post.error === null ? null : (
            <p role="alert" className="text-danger text-sm">
              {post.error.message}
            </p>
          )}
        </div>
      </form>

      <section className="space-y-1">
        <h2 className="text-brass-500 text-xs font-medium tracking-[0.14em] uppercase">Register</h2>
        {entries.isPending ? <p className="text-text-muted">Loading…</p> : null}
        {entries.error === null ? null : (
          <p role="alert" className="text-danger text-sm">
            {entries.error.message}
          </p>
        )}
        <ul className="divide-ink-800 divide-y">
          {(entries.data?.entries ?? []).map((entry) => {
            const postings = entry.postings ?? []
            const shown =
              postings.find((row) => !(row.amount_minor ?? '').startsWith('-')) ?? postings[0]
            const label =
              entry.note === undefined || entry.note === ''
                ? (entry.payee?.name ?? '—')
                : entry.note
            const outgoing = (shown?.amount_minor ?? '').startsWith('-')

            return (
              <li key={entry.ref} className="flex items-baseline gap-3 py-2.5 text-sm">
                <span className="text-text-muted w-24 shrink-0 tabular-nums">
                  {entry.occurred_on}
                </span>
                <span className="text-porcelain-100 flex-1 truncate">{label}</span>
                <span className="text-ink-300">{names.get(shown?.account_ref ?? '') ?? ''}</span>
                <span
                  className={`tabular-nums ${outgoing ? 'text-porcelain-200' : 'text-cherry-300'}`}
                >
                  {shown === undefined
                    ? ''
                    : formatMoney(shown.amount_minor ?? '0', units, entry.currency ?? baseCurrency)}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
