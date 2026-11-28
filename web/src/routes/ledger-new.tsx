import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Camera, Keyboard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'

import { createCapture } from '@/api/captures'
import { queryClient } from '@/api/query'
import type { Account, Payee } from '@/api/types'
import { BreakpointDesktop, BreakpointTablet } from '@/components/primitives/breakpoint'
import { Button } from '@/components/primitives/button'
import { control } from '@/components/primitives/control'
import { Field } from '@/components/primitives/field'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { SegmentGroup } from '@/components/primitives/segment-group'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { DateField, Form, TextField } from '@/components/ui/form'
import { useCreateEntry } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useSuggestion } from '@/hooks/queries/use-rules'
import { useMoney } from '@/hooks/use-money'
import { cn } from '@/lib/cn'
import { parseMoney } from '@/lib/money'
import {
  emptyEntryForm,
  entryResolver,
  isCategoryKind,
  isMoneyKind,
  type EntryFormValues,
} from '@/modules'

type Mode = 'manual' | 'scan'
type Direction = 'expense' | 'income'

/**
 * Writing an entry starts with a choice, not an amount: type it, or hand over the receipt and let
 * the intake queue it. `/ledger/new?mode=scan` is the same page with the other mode open, so a
 * phone's camera shortcut is one URL away.
 */
export function NewEntryPage() {
  const { mode } = useSearch({ from: '/ledger/new' })
  const navigate = useNavigate({ from: '/ledger/new' })
  const meta = useMeta()

  const go = (next: Mode) => {
    void navigate({ to: '/ledger/new', search: { mode: next } })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        items={[{ label: 'Ledger', to: '/ledger' }, { label: 'New entry' }]}
        title="Log something"
        subtitle="Two ways in: type it, or hand over the receipt and let intake queue it."
      />

      <BreakpointTablet>
        <SegmentGroup
          block
          value={mode}
          options={[
            { label: 'Type it', value: 'manual' },
            { label: 'Scan', value: 'scan' },
          ]}
          onValueChange={(next) => {
            go(next === 'scan' ? 'scan' : 'manual')
          }}
        />
      </BreakpointTablet>

      <BreakpointDesktop>
        <ModeCards mode={mode} />
      </BreakpointDesktop>

      {mode === 'manual' ? (
        <ManualEntry
          accounts={meta.data?.accounts ?? []}
          payees={meta.data?.payees ?? []}
          ready={meta.isSuccess}
        />
      ) : (
        <ScanPanel
          onQueued={() => {
            void navigate({ to: '/manage/captures' })
          }}
        />
      )}
    </div>
  )
}

/** Two ways in, spelled out once: the desk has the room for what each one does. */
function ModeCards({ mode }: { mode: Mode }) {
  const tab = 'flex items-center gap-3 rounded-md px-4 py-3 text-sm transition-colors'
  const on = 'bg-surface text-text border-border-strong border'
  const off = 'text-text-muted hover:text-text'

  return (
    <div className="border-border bg-surface-sunken grid gap-1 rounded-lg border p-1 sm:grid-cols-2">
      <Link
        to="/ledger/new"
        search={{ mode: 'manual' }}
        className={cn(tab, mode === 'manual' ? on : off)}
      >
        <Keyboard className="size-4" aria-hidden="true" strokeWidth={1.75} />
        <span className="space-y-0.5">
          <span className="block font-medium">Type it</span>
          <span className="text-text-faint block text-xs">Amount, who, what for, paid from.</span>
        </span>
      </Link>
      <Link
        to="/ledger/new"
        search={{ mode: 'scan' }}
        className={cn(tab, mode === 'scan' ? on : off)}
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
  )
}

/** The two kinds a person can mean, in the words the ledger files them under. */
const directions = [
  { label: 'Money out', value: 'expense' },
  { label: 'Money in', value: 'income' },
]

/**
 * The manual form reads top to bottom as one sentence: money out or in, what it was for, what it
 * was, who it was with, where it came from, how much and when. A category only ever offers the
 * half of the ledger the first switch names, so the direction is decided once and the two labels
 * below follow it.
 */
function ManualEntry({
  accounts,
  payees,
  ready,
}: {
  accounts: readonly Account[]
  payees: readonly Payee[]
  ready: boolean
}) {
  const navigate = useNavigate()
  const money = useMoney()
  const post = useCreateEntry()
  const [direction, setDirection] = useState<Direction>('expense')

  const categoriesOf = (kind: Direction) =>
    accounts
      .filter((account) => account.kind === kind)
      .map((account) => ({ label: account.name, value: account.ref }))

  // the account carries its kind: "Savings (asset)" says more than "Savings"
  const accountOptions = accounts
    .filter((account) => isMoneyKind(account.kind))
    .map((account) => ({ label: `${account.name} (${account.kind})`, value: account.ref }))

  if (!ready) {
    return (
      <Panel>
        <Text as="p" tone="muted" className="p-5 sm:p-6">
          Loading the accounts to pick from.
        </Text>
      </Panel>
    )
  }

  return (
    <Panel>
      <div className="p-5 sm:p-6">
        <Form<EntryFormValues>
          className="mt-4"
          defaultValues={emptyEntryForm(undefined, {
            accountRef: accountOptions[0]?.value,
            categoryRef: categoriesOf('expense')[0]?.value,
          })}
          resolver={entryResolver}
          submitLabel="Post entry"
          onCancel={() => void navigate({ to: '/ledger' })}
          onSubmit={(values) => {
            const amount = parseMoney(values.amount, money.scale.units)

            if (amount.sign() === 0) {
              return
            }

            const income = accounts.find((row) => row.ref === values.categoryRef)?.kind === 'income'
            const signed = income ? amount : amount.negate()

            post.mutate(
              {
                occurred_on: values.occurredOn,
                currency: money.scale.currency,
                note: values.note,
                ...(values.payeeRef === '' ? {} : { payee_ref: values.payeeRef }),
                postings: [
                  { account_ref: values.accountRef, amount_minor: signed.toMinor() },
                  { account_ref: values.categoryRef, amount_minor: signed.negate().toMinor() },
                ],
              },
              {
                onSuccess: async () => {
                  await queryClient.invalidateQueries({ queryKey: ['entries'] })
                  void navigate({ to: '/ledger' })
                },
              },
            )
          }}
        >
          {(form) => (
            <ManualFields
              form={form}
              accounts={accounts}
              payees={payees}
              direction={direction}
              onDirection={(next) => {
                setDirection(next)
                form.setValue('categoryRef', categoriesOf(next)[0]?.value ?? '', {
                  shouldDirty: true,
                })
              }}
              categoryOptions={categoriesOf(direction)}
              accountOptions={accountOptions}
            />
          )}
        </Form>

        {post.error === null ? null : (
          <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
            {post.error.message}
          </Text>
        )}
      </div>
    </Panel>
  )
}

function ManualFields({
  form,
  accounts,
  payees,
  direction,
  onDirection,
  categoryOptions,
  accountOptions,
}: {
  form: UseFormReturn<EntryFormValues>
  accounts: readonly Account[]
  payees: readonly Payee[]
  direction: Direction
  onDirection: (next: Direction) => void
  categoryOptions: { label: string; value: string }[]
  accountOptions: { label: string; value: string }[]
}) {
  const income = direction === 'income'

  return (
    <>
      <Field label="Kind">
        <SegmentGroup
          block
          value={direction}
          options={directions}
          onValueChange={(next) => {
            onDirection(next === 'income' ? 'income' : 'expense')
          }}
        />
      </Field>

      <CategoryField
        form={form}
        accounts={accounts}
        direction={direction}
        options={categoryOptions}
      />

      <TextField<EntryFormValues>
        name="note"
        label="What was it"
        placeholder="coffee, taxi, salary"
      />

      <PayeeField form={form} payees={payees} label={income ? 'Received from' : 'Paid to'} />

      <Controller
        control={form.control}
        name="accountRef"
        render={({ field, fieldState }) => (
          <Field label={income ? 'Received in' : 'Paid from'} error={fieldState.error?.message}>
            <SelectInput
              value={field.value}
              options={accountOptions}
              placeholder="pick an account"
              onChange={(next) => {
                field.onChange(next)
              }}
            />
          </Field>
        )}
      />

      <TextField<EntryFormValues> name="amount" label="Amount" placeholder="0" />

      <DateField<EntryFormValues> name="occurredOn" label="Day" />
    </>
  )
}

/**
 * The category, half at a time, with the rule engine answering underneath: the line says which
 * rule would decide this, and typing a note fills the category in until a person picks one.
 */
function CategoryField({
  form,
  accounts,
  direction,
  options,
}: {
  form: UseFormReturn<EntryFormValues>
  accounts: readonly Account[]
  direction: Direction
  options: { label: string; value: string }[]
}) {
  const note = form.watch('note')
  const [picked, setPicked] = useState(false)
  const answer = useSuggestion(note.trim().length < 3 ? {} : { text: note.trim(), kind: direction })

  useEffect(() => {
    const suggestion = answer.data

    if (suggestion === undefined || picked) {
      return
    }

    const known = accounts.some(
      (account) => account.ref === suggestion.account_ref && isCategoryKind(account.kind),
    )

    if (known) {
      form.setValue('categoryRef', suggestion.account_ref, { shouldDirty: false })
    }
  }, [answer.data, accounts, form, picked])

  return (
    <Controller
      control={form.control}
      name="categoryRef"
      render={({ field, fieldState }) => (
        <Field label="Category" error={fieldState.error?.message}>
          <div className="space-y-1.5">
            <SelectInput
              value={field.value}
              options={options}
              placeholder="pick a category"
              onChange={(next) => {
                setPicked(true)
                field.onChange(next)
              }}
            />
            {answer.data === undefined ? null : (
              <Text as="p" tone="caption" className="text-text-muted">
                {answer.data.why}
              </Text>
            )}
          </div>
        </Field>
      )}
    />
  )
}

/**
 * The payee is the shortcut: picking one writes the defaults it carries into the two refs below,
 * and both stay editable, because a default is a starting point and not a decision.
 */
function PayeeField({
  form,
  payees,
  label,
}: {
  form: UseFormReturn<EntryFormValues>
  payees: readonly Payee[]
  label: string
}) {
  const options = [
    { label: 'No payee', value: '' },
    ...payees.map((payee) => ({ label: payee.name, value: payee.ref })),
  ]

  return (
    <Controller
      control={form.control}
      name="payeeRef"
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message}>
          <SelectInput
            value={field.value}
            options={options}
            placeholder="nobody in particular"
            onChange={(next) => {
              field.onChange(next)

              const payee = payees.find((row) => row.ref === next)

              if (payee?.default_account_ref !== undefined) {
                form.setValue('accountRef', payee.default_account_ref, { shouldDirty: true })
              }

              if (payee?.default_category_ref !== undefined) {
                form.setValue('categoryRef', payee.default_category_ref, { shouldDirty: true })
              }
            }}
          />
        </Field>
      )}
    />
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
        <PanelHead eyebrow="Scan" />

        <Field label="Receipt">
          <input
            type="file"
            accept="image/*,application/pdf"
            className={cn(control(), 'file:text-text-muted py-2 file:mr-3 file:border-0')}
            onChange={(event) => {
              setFile(event.target.files?.[0])
            }}
          />
        </Field>

        <Field label="Note">
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
          {upload.isPending ? 'Queueing' : 'Queue capture'}
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
