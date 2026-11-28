import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Camera, Keyboard } from 'lucide-react'
import { useState } from 'react'
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
import { DateField, Form, SelectField, TextField } from '@/components/ui/form'
import { useCreateEntry } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
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
        title="New entry"
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
            void navigate({ to: '/captures' })
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

/**
 * The manual form is only mounted once the meta read lands: its opening values are the two refs it
 * offers, and a form is the wrong place to discover that the list arrived late.
 *
 * The direction is not a field. A category either files money going out or money coming in, so
 * picking an income category is what turns the entry around: the account gains and the category
 * gives, instead of the other way about.
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

  const categoryOptions = accounts
    .filter((account) => isCategoryKind(account.kind))
    .map((account) => ({ label: account.name, value: account.ref }))

  const accountOptions = accounts
    .filter((account) => isMoneyKind(account.kind))
    .map((account) => ({ label: account.name, value: account.ref }))

  const isIncome = (ref: string) =>
    accounts.find((account) => account.ref === ref)?.kind === 'income'

  if (!ready) {
    return (
      <Panel>
        <Text as="p" tone="muted" className="p-5 sm:p-6">
          Loading the accounts to pick from…
        </Text>
      </Panel>
    )
  }

  return (
    <Panel>
      <div className="p-5 sm:p-6">
        <PanelHead
          eyebrow="Manual entry"
          description="Two postings, one amount: one side takes what the other gives up."
        />

        <Form<EntryFormValues>
          className="mt-4"
          defaultValues={emptyEntryForm(undefined, {
            accountRef: accountOptions[0]?.value,
            categoryRef: categoryOptions[0]?.value,
          })}
          resolver={entryResolver}
          submitLabel="Post entry"
          onCancel={() => void navigate({ to: '/ledger' })}
          onSubmit={(values) => {
            const amount = parseMoney(values.amount, money.scale.units)

            if (amount.sign() === 0) {
              return
            }

            const income = isIncome(values.categoryRef)
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
          {(form) => {
            const income = isIncome(form.watch('categoryRef'))

            return (
              <>
                <TextField<EntryFormValues>
                  name="amount"
                  label="Amount"
                  hint={`In ${money.scale.currency}, the currency the ledger is kept in.`}
                  placeholder="0"
                />
                <TextField<EntryFormValues>
                  name="note"
                  label="What was it"
                  placeholder="coffee, taxi, salary…"
                />
                <DateField<EntryFormValues> name="occurredOn" label="Day" />
                <PayeeField form={form} payees={payees} />
                <SelectField<EntryFormValues>
                  name="accountRef"
                  label={income ? 'Received in' : 'Paid from'}
                  options={accountOptions}
                  placeholder="pick an account…"
                />
                <SelectField<EntryFormValues>
                  name="categoryRef"
                  label="Category"
                  options={categoryOptions}
                  placeholder="pick a category…"
                  hint="An income category turns the entry around."
                />
                <Text as="p" tone="caption" className="text-text-faint">
                  {income
                    ? 'Money in: the account gains, the category gives.'
                    : 'Money out: the category takes, the account gives up.'}
                </Text>
              </>
            )
          }}
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

/**
 * The payee is the shortcut: picking one writes the defaults it carries into the two refs below,
 * and both stay editable, because a default is a starting point and not a decision.
 */
function PayeeField({
  form,
  payees,
}: {
  form: UseFormReturn<EntryFormValues>
  payees: readonly Payee[]
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
        <Field
          label="Paid to"
          error={fieldState.error?.message}
          hint="Picking one fills in the defaults it carries."
        >
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
