import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { api, errorMessage } from '@/api/client'
import { queryClient } from '@/api/query'
import { formatMoney, toMinor } from '@/lib/money'

const listLimit = 50

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

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [categoryRef, setCategoryRef] = useState('')
  const [accountRef, setAccountRef] = useState('')

  const accounts = meta.data?.accounts ?? []
  const baseCurrency = meta.data?.settings?.base_currency ?? 'USD'
  const units = (meta.data?.currencies ?? []).find((row) => row.code === baseCurrency)?.minor_units ?? 2

  const categories = accounts.filter((row) => row.kind === 'expense' || row.kind === 'income')
  const sources = accounts.filter((row) => row.kind === 'asset' || row.kind === 'liability')

  const category = categoryRef === '' ? categories[0]?.ref : categoryRef
  const account = accountRef === '' ? sources[0]?.ref : accountRef

  const names = new Map(accounts.map((row) => [row.ref, row.name]))

  const post = useMutation({
    mutationFn: async () => {
      if (category === undefined || account === undefined) {
        throw new Error('create an account first')
      }

      const minor = toMinor(amount, units)
      if (minor === '0') {
        throw new Error('enter an amount')
      }

      const { error, response } = await api.POST('/api/entries', {
        body: {
          occurred_on: day,
          currency: baseCurrency,
          note,
          postings: [
            { account_ref: category, amount_minor: minor },
            { account_ref: account, amount_minor: minor.startsWith('-') ? minor.slice(1) : `-${minor}` },
          ],
        },
      })

      if (error !== undefined) {
        throw new Error(errorMessage(error, response.status))
      }
    },
    onSuccess: async () => {
      setAmount('')
      setNote('')
      await queryClient.invalidateQueries({ queryKey: ['entries'] })
      await queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
  })

  return (
    <div className="space-y-8">
      <form
        className="space-y-3 rounded border border-neutral-800 p-4"
        onSubmit={(event) => {
          event.preventDefault()
          post.mutate()
        }}
      >
        <h2 className="text-sm font-medium text-neutral-400">Quick capture</h2>
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            required
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value)
            }}
            placeholder={`amount (${baseCurrency})`}
            className="w-32 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 tabular-nums outline-none focus:border-neutral-500"
          />
          <input
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
            }}
            placeholder="what was it"
            className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-500"
          />
          <input
            type="date"
            required
            value={day}
            onChange={(event) => {
              setDay(event.target.value)
            }}
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-500"
          />
        </div>
        <div className="flex gap-2 text-sm">
          <label className="flex flex-1 items-center gap-2">
            <span className="text-neutral-500">Category</span>
            <select
              value={category ?? ''}
              onChange={(event) => {
                setCategoryRef(event.target.value)
              }}
              className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
            >
              {categories.map((row) => (
                <option key={row.ref} value={row.ref}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 items-center gap-2">
            <span className="text-neutral-500">Paid from</span>
            <select
              value={account ?? ''}
              onChange={(event) => {
                setAccountRef(event.target.value)
              }}
              className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1"
            >
              {sources.map((row) => (
                <option key={row.ref} value={row.ref}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={post.isPending}
          className="rounded bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
        >
          {post.isPending ? 'Posting…' : 'Post entry'}
        </button>
        {post.error !== null ? (
          <p role="alert" className="text-sm text-red-400">
            {post.error.message}
          </p>
        ) : null}
      </form>

      <section className="space-y-1">
        <h2 className="text-sm font-medium text-neutral-400">Register</h2>
        {entries.isPending ? <p className="text-neutral-500">Loading…</p> : null}
        {entries.error !== null ? (
          <p role="alert" className="text-sm text-red-400">
            {entries.error.message}
          </p>
        ) : null}
        <ul className="divide-y divide-neutral-900">
          {(entries.data?.entries ?? []).map((entry) => {
            const postings = entry.postings ?? []
            const shown =
              postings.find((row) => !(row.amount_minor ?? '').startsWith('-')) ?? postings[0]
            const label = entry.note === undefined || entry.note === '' ? (entry.payee?.name ?? '—') : entry.note

            return (
              <li key={entry.ref} className="flex items-baseline gap-3 py-2 text-sm">
                <span className="tabular-nums text-neutral-500">{entry.occurred_on}</span>
                <span className="flex-1 truncate">{label}</span>
                <span className="text-neutral-500">
                  {shown === undefined ? '' : (names.get(shown.account_ref ?? '') ?? '')}
                </span>
                <span className="tabular-nums">
                  {shown === undefined ? '' : formatMoney(shown.amount_minor ?? '0', units, entry.currency ?? baseCurrency)}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
