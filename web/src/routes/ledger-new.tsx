import { Schema } from 'effect'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Camera, Keyboard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'

import { useMutation } from '@tanstack/react-query'
import { createCapture } from '@/api/captures'
import { queryClient } from '@/api/query'
import { Button } from '@/components/primitives/button'
import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { control } from '@/components/primitives/control'
import { DateInput } from '@/components/primitives/date-input'
import { Field } from '@/components/primitives/field'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useCreateEntry } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { cn } from '@/lib/cn'
import { parseMoney } from '@/lib/money'
import {
  accountIndex,
  emptyEntryForm,
  EntryForm,
  isCategoryKind,
  isMoneyKind,
  type EntryFormValues,
} from '@/modules'

const resolver: Resolver<EntryFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(EntryForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

/**
 * Writing an entry starts with a choice, not an amount: type it, or hand over the receipt and let
 * the intake queue it. `/ledger/new?mode=scan` is the same page with the other mode open, so a
 * phone's camera shortcut is one URL away.
 */
/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const newEntryCrumbs = [{ label: 'Ledger', to: '/ledger' }, { label: 'New entry' }] as const

export function NewEntryPage() {
  const { mode } = useSearch({ from: '/ledger/new' })
  const navigate = useNavigate({ from: '/ledger/new' })
  const meta = useMeta()
  const money = useMoney()

  const accounts = meta.data?.accounts ?? []
  const index = accountIndex(accounts)
  const categoryOptions = accounts
    .filter((row) => isCategoryKind(row.kind))
    .map((row) => ({ label: row.name, value: row.ref }))
  const accountOptions = accounts
    .filter((row) => isMoneyKind(row.kind))
    .map((row) => ({ label: row.name, value: row.ref }))

  const form = useForm<EntryFormValues>({ resolver, defaultValues: emptyEntryForm() })

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
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: ['entries'] })
          void navigate({ to: '/ledger' })
        },
      },
    )
  })

  const errors = form.formState.errors

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <Breadcrumb items={newEntryCrumbs} />
        <Text as="h1" tone="display">
          New entry
        </Text>
      </header>

      <div className="border-border bg-surface-sunken grid gap-1 rounded-lg border p-1 sm:grid-cols-2">
        <Link
          to="/ledger/new"
          search={{ mode: 'manual' }}
          className={cn(
            'flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors',
            mode === 'manual'
              ? 'bg-surface text-text border-border-strong border'
              : 'text-text-muted hover:text-text',
          )}
        >
          <Keyboard className="size-4" aria-hidden="true" strokeWidth={1.75} />
          <span className="space-y-0.5">
            <span className="block font-medium">Type it</span>
            <span className="text-text-faint block text-xs">Amount, what it was, paid from.</span>
          </span>
        </Link>
        <Link
          to="/ledger/new"
          search={{ mode: 'scan' }}
          className={cn(
            'flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors',
            mode === 'scan'
              ? 'bg-surface text-text border-border-strong border'
              : 'text-text-muted hover:text-text',
          )}
        >
          <Camera className="size-4" aria-hidden="true" strokeWidth={1.75} />
          <span className="space-y-0.5">
            <span className="block font-medium">Scan a receipt</span>
            <span className="text-text-faint block text-xs">
              A photo or a PDF, queued as a capture.
            </span>
          </span>
        </Link>
      </div>

      {mode === 'manual' ? (
        <Panel>
          <form className="space-y-5 p-5 sm:p-6" onSubmit={submit}>
            <PanelHead
              eyebrow="Manual entry"
              description="It posts straight to the ledger, balanced against the category you pick."
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Amount" error={errors.amount?.message} className="sm:col-span-2">
                <div className="relative">
                  <TextInput
                    inputMode="decimal"
                    placeholder="0"
                    autoComplete="off"
                    aria-label="Amount"
                    className="h-14 pr-14 font-mono text-2xl tracking-tight"
                    {...form.register('amount')}
                  />
                  <span className="text-text-muted pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-[0.6875rem] uppercase">
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
                <Text as="p" tone="caption" className="text-danger" role="alert">
                  {errors.root.message}
                </Text>
              )}
              {post.error === null ? null : (
                <Text as="p" tone="caption" className="text-danger" role="alert">
                  {post.error.message}
                </Text>
              )}
            </div>
          </form>
        </Panel>
      ) : (
        <ScanPanel
          onQueued={() => {
            void navigate({ to: '/captures' })
          }}
        />
      )}

      <Text as="p" tone="caption" className="text-text-faint">
        An account holds money. A category says what the money was for. Every entry touches one of
        each:{' '}
        {accounts.length === 0 ? 'no accounts yet' : `${String(index.size)} accounts to pick from`}.
      </Text>
    </div>
  )
}

/** The photo path: one file, an optional note beside it, and the intake queue does the rest. */
function ScanPanel({ onQueued }: { onQueued: () => void }) {
  const [file, setFile] = useState<File>()
  const [note, setNote] = useState('')

  const upload = useMutation({
    mutationFn: async () => {
      if (file === undefined) {
        throw new Error('choose a photo or a PDF first')
      }

      return createCapture({ file, kind: 'image', rawText: note === '' ? undefined : note })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['captures'] })
      onQueued()
    },
  })

  return (
    <Panel>
      <form
        className="space-y-5 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          upload.mutate()
        }}
      >
        <PanelHead
          eyebrow="Scan"
          description="Nothing posts itself: the file lands in captures, and you approve what it was."
        />

        <Field label="Receipt" hint="A photo or a PDF, up to the artifact size cap.">
          <input
            type="file"
            accept="image/*,application/pdf"
            className={cn(control(), 'file:text-text-muted py-2 file:mr-3 file:border-0')}
            onChange={(event) => {
              setFile(event.target.files?.[0])
            }}
          />
        </Field>

        <Field label="Note" hint="Optional: what this is, while you still remember.">
          <TextInput
            value={note}
            placeholder="lunch with the team"
            autoComplete="off"
            onChange={(event) => {
              setNote(event.target.value)
            }}
          />
        </Field>

        <Button
          type="submit"
          size="lg"
          block
          loading={upload.isPending}
          disabled={file === undefined}
        >
          {upload.isPending ? 'Queueing…' : 'Queue capture'}
        </Button>

        {upload.error === null ? null : (
          <Text as="p" tone="caption" className="text-danger" role="alert">
            {upload.error.message}
          </Text>
        )}
      </form>
    </Panel>
  )
}
