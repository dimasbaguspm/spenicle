import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'

import { downloadArtifact } from '@/api/captures'
import type { Account, Payee } from '@/api/types'
import { Button } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { Field } from '@/components/primitives/field'
import { SwitchInput } from '@/components/primitives/switch-input'
import { DateField, Form, SelectField, TextField } from '@/components/ui/form'
import { useCaptures, useReviewCapture } from '@/hooks/queries/use-captures'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { DateFormat, formatDate } from '@/lib/date'
import { saveBlob } from '@/lib/download'
import { parseMoney } from '@/lib/money'
import { absent } from '@/lib/text'
import {
  emptyEntryForm,
  entryResolver,
  isCategoryKind,
  isMoneyKind,
  type EntryFormValues,
} from '@/modules'
import { useState } from 'react'

/**
 * The review screen: a capture is unconfirmed by definition, and approval is the only thing that
 * writes an entry. The defaults come from what the intake already knows (its note, its suggested
 * category, the first account), and every one of them is editable, because a suggestion is not a
 * decision.
 */
export function CaptureReviewPage() {
  const { ref } = useParams({ from: '/manage/captures/$ref' })
  const navigate = useNavigate()
  const held = useCaptures({ refs: ref, limit: 1 })
  const meta = useMeta()
  const money = useMoney()

  const capture = held.data?.captures[0]
  const accounts = meta.data?.accounts ?? []
  const payees = meta.data?.payees ?? []
  const pending = capture?.status === 'pending' || capture?.status === 'duplicate'

  return (
    <div className="space-y-6">
      <PageHeader
        items={[
          { label: 'Manage', to: '/manage' },
          { label: 'Captures', to: '/manage/captures' },
          { label: 'Review' },
        ]}
        title="Review a capture"
      />

      {held.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {held.error.message}
        </Text>
      )}

      <Panel>
        <div className="space-y-1 p-5 sm:p-6">
          <Text as="p" tone="section">
            {capture?.kind ?? 'capture'}, {capture?.status ?? absent}
          </Text>
          <Text as="p" tone="body">
            {capture?.raw_text === undefined || capture.raw_text === ''
              ? 'No text came with this one.'
              : capture.raw_text}
          </Text>
          <Text as="p" tone="caption" className="text-text-faint">
            Arrived {formatDate(capture?.received_at, DateFormat.Timestamp)}
            {capture?.extraction_rail === undefined
              ? ', extracted by hand'
              : `, extracted by ${capture.extraction_rail}`}
            {capture?.extraction_model === undefined ? '' : ` (${capture.extraction_model})`}
            {capture?.resolved_at === undefined
              ? ''
              : `, resolved ${formatDate(capture.resolved_at, DateFormat.Timestamp)}`}
          </Text>
          {capture?.resolution_note === undefined || capture.resolution_note === '' ? null : (
            <Text as="p" tone="caption" className="text-text-muted">
              {capture.resolution_note}
            </Text>
          )}
        </div>
      </Panel>

      <SourcePanel captureRef={ref} />

      {pending ? (
        <ApprovePanel
          captureRef={ref}
          accounts={accounts}
          payees={payees}
          note={capture?.raw_text ?? ''}
          suggested={capture?.suggested_category_ref}
          onDone={() => void navigate({ to: '/manage/captures' })}
        />
      ) : (
        <Panel>
          <Text as="p" tone="muted" className="p-5 sm:p-6">
            This capture has already been resolved.
            {capture?.resolved_entry_ref === undefined ? null : (
              <> It posted an entry; open it from the register.</>
            )}
          </Text>
        </Panel>
      )}

      <div className="flex justify-end">
        <Text as="p" tone="caption" className="text-text-faint">
          Approving writes two postings in {money.scale.currency}.
        </Text>
      </div>
    </div>
  )
}

function ApprovePanel({
  captureRef,
  accounts,
  payees,
  note,
  suggested,
  onDone,
}: {
  captureRef: string
  accounts: readonly Account[]
  payees: readonly Payee[]
  note: string
  suggested: string | undefined
  onDone: () => void
}) {
  const money = useMoney()
  const review = useReviewCapture()
  const [reason, setReason] = useState('')
  const [learn, setLearn] = useState(false)

  const categoryOptions = accounts
    .filter((account) => isCategoryKind(account.kind))
    .map((account) => ({ label: account.name, value: account.ref }))

  const accountOptions = accounts
    .filter((account) => isMoneyKind(account.kind))
    .map((account) => ({ label: account.name, value: account.ref }))

  const isIncome = (ref: string) => accounts.find((a) => a.ref === ref)?.kind === 'income'

  const defaults = emptyEntryForm(undefined, {
    accountRef: accountOptions[0]?.value,
    categoryRef: suggested ?? categoryOptions[0]?.value,
  })

  return (
    <div className="space-y-6">
      <Panel>
        <div className="p-5 sm:p-6">
          <Form<EntryFormValues>
            defaultValues={{ ...defaults, note }}
            resolver={entryResolver}
            submitLabel="Approve and post"
            onCancel={onDone}
            onSubmit={(values) => {
              const amount = parseMoney(values.amount, money.scale.units)

              if (amount.sign() === 0) {
                return
              }

              const signed = isIncome(values.categoryRef) ? amount : amount.negate()

              review.mutate(
                {
                  ref: captureRef,
                  body: {
                    action: 'approve',
                    occurred_on: values.occurredOn,
                    currency: money.scale.currency,
                    note: values.note,
                    ...(values.payeeRef === '' ? {} : { payee_ref: values.payeeRef }),
                    ...(learn ? { learn: true } : {}),
                    postings: [
                      { account_ref: values.accountRef, amount_minor: signed.toMinor() },
                      { account_ref: values.categoryRef, amount_minor: signed.negate().toMinor() },
                    ],
                  },
                },
                { onSuccess: onDone },
              )
            }}
          >
            {() => (
              <>
                <SwitchInput
                  checked={learn}
                  label="Remember this"
                  onCheckedChange={(next) => {
                    setLearn(next)
                  }}
                />
                <SelectField<EntryFormValues>
                  name="categoryRef"
                  label="Category"
                  options={categoryOptions}
                  placeholder="pick a category"
                />
                <SelectField<EntryFormValues>
                  name="accountRef"
                  label="Account"
                  options={accountOptions}
                  placeholder="pick an account"
                />
                <SelectField<EntryFormValues>
                  name="payeeRef"
                  label="Paid to"
                  options={[
                    { label: 'No payee', value: '' },
                    ...payees.map((payee) => ({ label: payee.name, value: payee.ref })),
                  ]}
                  placeholder="nobody in particular"
                />
                <TextField<EntryFormValues> name="amount" label="Amount" placeholder="0" />
                <DateField<EntryFormValues> name="occurredOn" label="Day" />
                <TextField<EntryFormValues> name="note" label="What was it" />
              </>
            )}
          </Form>
          {review.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
              {review.error.message}
            </Text>
          )}
        </div>
      </Panel>

      <Panel>
        <div className="space-y-4 p-5 sm:p-6">
          <PanelHead
            eyebrow="Or"
            description="A rejection keeps the file and the reason, and posts nothing."
          />
          <Field label="Reason">
            <TextInput
              value={reason}
              placeholder="not a receipt, already logged"
              autoComplete="off"
              onChange={(event) => {
                setReason(event.target.value)
              }}
            />
          </Field>
          <Button
            tone="quiet"
            size="sm"
            loading={review.isPending}
            onClick={() => {
              review.mutate(
                {
                  ref: captureRef,
                  body: { action: 'reject', ...(reason === '' ? {} : { reason }) },
                },
                { onSuccess: onDone },
              )
            }}
          >
            Reject capture
          </Button>
        </div>
      </Panel>
    </div>
  )
}

/**
 * The document itself, before anything the intake guessed about it. It is fetched with the
 * credential and handed to the browser as a blob, because an `<a href>` would arrive unauthenticated.
 */
function SourcePanel({ captureRef }: { captureRef: string }) {
  const save = useMutation({
    mutationFn: () => downloadArtifact(captureRef),
    onSuccess: (file) => {
      saveBlob(file.blob, file.filename)
    },
  })

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div className="space-y-0.5">
          <Text as="p" tone="section">
            Source
          </Text>
          <Text as="p" tone="muted" className="text-sm">
            The receipt, the statement or the screenshot as it was uploaded.
          </Text>
        </div>
        <Button
          tone="quiet"
          size="sm"
          loading={save.isPending}
          onClick={() => {
            save.mutate()
          }}
        >
          Download file
        </Button>
      </div>
      {save.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger px-5 pb-4 sm:px-6" role="alert">
          {save.error.message}
        </Text>
      )}
    </Panel>
  )
}
