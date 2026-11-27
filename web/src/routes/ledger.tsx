import { useMutation, useQuery } from '@tanstack/react-query'
import { Schema } from 'effect'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'

import { api, errorMessage } from '@/api/client'
import { queryClient } from '@/api/query'
import { AccountSelect } from '@/components/account-select'
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

  return (
    <div className="space-y-8">
      <form className="space-y-3 rounded border border-neutral-800 p-4" onSubmit={submit}>
        <h2 className="text-sm font-medium text-neutral-400">Quick capture</h2>
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            placeholder={`amount (${baseCurrency})`}
            className="w-32 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-500"
            {...form.register('amount')}
          />
          <input
            placeholder="what was it"
            className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-500"
            {...form.register('note')}
          />
          <input
            type="date"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-500"
            {...form.register('occurredOn')}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Controller
              control={form.control}
              name="categoryRef"
              render={({ field }) => (
                <AccountSelect
                  label="Category"
                  placeholder="pick a category"
                  value={field.value}
                  options={categoryOptions}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <div className="flex-1">
            <Controller
              control={form.control}
              name="accountRef"
              render={({ field }) => (
                <AccountSelect
                  label="Paid from"
                  placeholder="pick an account"
                  value={field.value}
                  options={accountOptions}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={post.isPending}
          className="rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {post.isPending ? 'Posting…' : 'Post entry'}
        </button>
        {form.formState.errors.root === undefined ? null : (
          <p role="alert" className="text-sm text-red-400">
            {form.formState.errors.root.message}
          </p>
        )}
        {post.error === null ? null : (
          <p role="alert" className="text-sm text-red-400">
            {post.error.message}
          </p>
        )}
      </form>

      <section className="space-y-1">
        <h2 className="text-sm font-medium text-neutral-400">Register</h2>
        {entries.isPending ? <p className="text-neutral-500">Loading…</p> : null}
        {entries.error === null ? null : (
          <p role="alert" className="text-sm text-red-400">
            {entries.error.message}
          </p>
        )}
        <ul className="divide-y divide-neutral-900">
          {(entries.data?.entries ?? []).map((entry) => {
            const postings = entry.postings ?? []
            const shown =
              postings.find((row) => !(row.amount_minor ?? '').startsWith('-')) ?? postings[0]
            const label =
              entry.note === undefined || entry.note === ''
                ? (entry.payee?.name ?? '—')
                : entry.note

            return (
              <li key={entry.ref} className="flex items-baseline gap-3 py-2 text-sm">
                <span className="tabular-nums text-neutral-500">{entry.occurred_on}</span>
                <span className="flex-1 truncate">{label}</span>
                <span className="text-neutral-500">
                  {shown === undefined ? '' : (names.get(shown.account_ref ?? '') ?? '')}
                </span>
                <span className="tabular-nums">
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
