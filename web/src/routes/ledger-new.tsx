import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Camera, Keyboard, Mic } from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'

import { createCapture, parkCapture } from '@/api/captures'
import { queryClient } from '@/api/query'
import type { Account, Payee } from '@/api/types'
import { BreakpointDesktop } from '@/components/primitives/breakpoint'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { FileUpload } from '@/components/primitives/file-upload'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { SegmentGroup } from '@/components/primitives/segment-group'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { TextAreaInput } from '@/components/primitives/text-area-input'
import { TextInput } from '@/components/primitives/text-input'
import { DateField, Form, TextField } from '@/components/ui/form'
import { useCreateEntry } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useSuggestion } from '@/hooks/queries/use-rules'
import { useDesktop } from '@/hooks/use-desktop'
import { useMoney } from '@/hooks/use-money'
import { cn } from '@/lib/cn'
import { clearDraft, readDraft, writeDraft } from '@/lib/draft'
import { parseMoney } from '@/lib/money'
import {
  CameraShot,
  cameraSupported,
  canDictate,
  dictate,
  emptyEntryForm,
  entryResolver,
  isCategoryKind,
  isMoneyKind,
  type Dictation,
  type EntryFormValues,
} from '@/modules'

type Mode = 'choose' | 'manual' | 'photo' | 'voice'
type Direction = 'expense' | 'income'

/**
 * Three ways in, and a fourth that is not built yet. The list is the screen: typing posts an entry
 * now, a photo or a statement and a dictated line go to the intake queue where a person reviews
 * them, and voice is a text box with the keyboard's own dictation behind it until a transcription
 * rail exists. Nothing here writes a ledger entry on its own except the form.
 */
const intakes = [
  {
    mode: 'manual',
    label: 'Type it',
    note: 'The amount, who, and what for. Posts now.',
    Icon: Keyboard,
  },
  {
    mode: 'photo',
    label: 'Hand over a photo',
    note: 'A receipt or a PDF, queued for review.',
    Icon: Camera,
  },
  {
    mode: 'voice',
    label: 'Say it',
    note: 'Dictate a line, sort it out later.',
    Icon: Mic,
  },
] as const

/**
 * A desk opens the form and keeps the three intakes in a rail beside it, so switching is one click
 * and never a page change. A phone has no room for both: it asks which way in first, big enough to
 * hit with a thumb, and the chosen intake replaces the question. The choice lives in the URL either
 * way, so a camera shortcut is still one link.
 */
export function NewEntryPage() {
  const { mode } = useSearch({ from: '/ledger/new' })
  const navigate = useNavigate({ from: '/ledger/new' })
  const meta = useMeta()
  const desktop = useDesktop()

  const active: Mode = mode === 'choose' && desktop ? 'manual' : mode

  const pick = (next: Mode) => {
    void navigate({ to: '/ledger/new', search: { mode: next } })
  }

  const queued = () => {
    void navigate({ to: '/manage/captures' })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        items={[{ label: 'Ledger', to: '/ledger' }, { label: 'New entry' }]}
        title="Log something"
        subtitle="Type it now, or hand it over and sort it out later."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <div className="min-w-0 space-y-3">
          {mode === 'choose' ? null : (
            <Button
              tone="quiet"
              size="sm"
              onClick={() => {
                pick('choose')
              }}
            >
              Pick another way in
            </Button>
          )}

          {active === 'choose' ? <IntakeChooser active={active} onPick={pick} big /> : null}

          {active === 'manual' ? (
            <ManualEntry
              accounts={meta.data?.accounts ?? []}
              payees={meta.data?.payees ?? []}
              ready={meta.isSuccess}
            />
          ) : null}

          {active === 'photo' ? <PhotoPanel onQueued={queued} /> : null}
          {active === 'voice' ? <VoicePanel onQueued={queued} /> : null}
        </div>

        <BreakpointDesktop>
          <div className="space-y-2">
            <Text as="p" tone="caption" className="text-text-faint uppercase tracking-[0.14em]">
              Hand it over
            </Text>
            <IntakeChooser active={active} onPick={pick} />
          </div>
        </BreakpointDesktop>
      </div>
    </div>
  )
}

/** The three ways in, as cards: a phone gets the page, a desk gets the rail. */
function IntakeChooser({
  active,
  onPick,
  big,
}: {
  active: Mode
  onPick: (mode: Mode) => void
  big?: boolean
}) {
  return (
    <div className="grid gap-2">
      {intakes.map((intake) => (
        <button
          key={intake.mode}
          type="button"
          aria-label={intake.label}
          onClick={() => {
            onPick(intake.mode)
          }}
          className={cn(
            'border-border flex items-start gap-3 rounded-lg border text-left transition-colors',
            big === true ? 'p-5' : 'p-4',
            active === intake.mode
              ? 'border-border-strong bg-surface'
              : 'bg-surface-sunken hover:border-border-strong',
          )}
        >
          <intake.Icon
            className="text-text-muted mt-0.5 size-4 shrink-0"
            aria-hidden="true"
            strokeWidth={1.75}
          />
          <span className="min-w-0 space-y-0.5">
            <span className="block text-sm font-medium">{intake.label}</span>
            <span className="text-text-faint block text-xs">{intake.note}</span>
          </span>
        </button>
      ))}
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
 * was, who it was with, where it came from, how much and when. A phone leads with the amount and
 * opens a digit keyboard, because that is the one thing a person already knows when they reach for
 * the screen; a desk keeps the sentence in order, since the keyboard is not the bottleneck there.
 *
 * The draft is the tab's: a reload, a back gesture or a crash restores what was typed, and posting
 * or cancelling throws it away.
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
  const [draft] = useState(() => readDraft<EntryFormValues>())

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
          defaultValues={{
            ...emptyEntryForm(undefined, {
              accountRef: accountOptions[0]?.value,
              categoryRef: categoriesOf('expense')[0]?.value,
            }),
            ...draft,
          }}
          resolver={entryResolver}
          submitLabel="Post entry"
          onCancel={() => {
            clearDraft()
            void navigate({ to: '/ledger' })
          }}
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
                  clearDraft()
                  await queryClient.invalidateQueries({ queryKey: ['entries'] })
                  void navigate({ to: '/ledger' })
                },
              },
            )
          }}
        >
          {(form) => <ManualFields form={form} accounts={accounts} payees={payees} />}
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
 * The fields, in the order the device deserves. Both orders are the same seven elements, so this
 * is a reordering and never a second form; `kind` and `amount` are the two that move.
 */
function ManualFields({
  form,
  accounts,
  payees,
}: {
  form: UseFormReturn<EntryFormValues>
  accounts: readonly Account[]
  payees: readonly Payee[]
}) {
  const desktop = useDesktop()

  const categoriesOf = (kind: Direction) =>
    accounts
      .filter((account) => account.kind === kind)
      .map((account) => ({ label: account.name, value: account.ref }))

  const accountOptions = accounts
    .filter((account) => isMoneyKind(account.kind))
    .map((account) => ({ label: `${account.name} (${account.kind})`, value: account.ref }))

  // the category is the direction: an expense category means money out, automatically
  const categoryRef = form.watch('categoryRef')
  const direction: Direction =
    accounts.find((account) => account.ref === categoryRef)?.kind === 'income'
      ? 'income'
      : 'expense'
  const income = direction === 'income'

  useEffect(() => {
    const subscription = form.watch((values) => {
      writeDraft(values)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [form])

  const fields = {
    amount: (
      <TextField<EntryFormValues>
        name="amount"
        label="Amount"
        placeholder="0"
        inputMode="decimal"
      />
    ),
    kind: (
      <Field label="Kind">
        <SegmentGroup
          block
          value={direction}
          options={directions}
          onValueChange={(next) => {
            form.setValue(
              'categoryRef',
              categoriesOf(next === 'income' ? 'income' : 'expense')[0]?.value ?? '',
              {
                shouldDirty: true,
              },
            )
          }}
        />
      </Field>
    ),
    category: (
      <CategoryField
        form={form}
        accounts={accounts}
        direction={direction}
        options={categoriesOf(direction)}
      />
    ),
    note: (
      <TextField<EntryFormValues>
        name="note"
        label="What was it"
        placeholder="coffee, taxi, salary"
      />
    ),
    payee: <PayeeField form={form} payees={payees} label={income ? 'Received from' : 'Paid to'} />,
    account: (
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
    ),
    day: <DateField<EntryFormValues> name="occurredOn" label="Day" />,
  }

  const order: readonly (keyof typeof fields)[] = desktop
    ? ['kind', 'category', 'note', 'payee', 'account', 'amount', 'day']
    : ['amount', 'kind', 'category', 'note', 'payee', 'account', 'day']

  return (
    <>
      {order.map((name) => (
        <Fragment key={name}>{fields[name]}</Fragment>
      ))}
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

/**
 * The photo path: the camera when the device has one, a chosen file when it does not, and one note
 * beside either. The frame comes back as a JPEG through a canvas, so what was on screen is what
 * reaches the queue; a PDF picked from disk stays a `statement` capture, a photo an `image` one.
 */
function PhotoPanel({ onQueued }: { onQueued: () => void }) {
  const [shot, setShot] = useState<File>()
  const [preview, setPreview] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    return () => {
      if (preview !== '') {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const take = (file: File) => {
    setShot(file)
    setPreview(URL.createObjectURL(file))
  }

  const discard = () => {
    if (preview !== '') {
      URL.revokeObjectURL(preview)
    }

    setPreview('')
    setShot(undefined)
  }

  const upload = useMutation({
    mutationFn: async () => {
      if (shot === undefined) {
        throw new Error('take a photo or choose a file first')
      }

      return createCapture({
        file: shot,
        kind: shot.type.startsWith('image/') ? 'image' : 'statement',
        ...(note.trim() === '' ? {} : { rawText: note.trim() }),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['captures'] })
      onQueued()
    },
  })

  return (
    <Panel>
      <form
        className="space-y-4 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          upload.mutate()
        }}
      >
        {shot === undefined || preview === '' ? (
          <div className="space-y-3">
            {cameraSupported() ? <CameraShot onCapture={take} /> : null}
            <FileUpload
              accept={{
                'image/*': ['.png', '.jpg', '.jpeg', '.heic', '.webp'],
                'application/pdf': ['.pdf'],
              }}
              label={
                cameraSupported()
                  ? 'Or pick a photo, or a PDF statement'
                  : 'Take a photo, or pick a photo or a PDF'
              }
              onFilesChange={(files) => {
                const file = files[0]

                if (file !== undefined) {
                  take(file)
                }
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <img
              src={preview}
              alt="The receipt you took"
              className="bg-surface-sunken max-h-[58dvh] w-full rounded-lg object-contain sm:max-h-96"
            />
            <Button tone="quiet" size="sm" onClick={discard}>
              Take another
            </Button>
          </div>
        )}

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
          disabled={shot === undefined}
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

/**
 * The voice path: a record button that dictates into the box below, with the words arriving as you
 * speak and settling when you pause. The audio is never kept — the recogniser lives in the browser,
 * and what the queue receives is the sentence, editable, exactly like something typed. A device
 * without a recogniser simply does not get the button; the box still works.
 */
function VoicePanel({ onQueued }: { onQueued: () => void }) {
  const [line, setLine] = useState('')
  const [listening, setListening] = useState(false)
  const session = useRef<Dictation | undefined>(undefined)
  const settled = useRef('')

  useEffect(() => {
    return () => {
      session.current?.stop()
      session.current = undefined
    }
  }, [])

  const stop = () => {
    session.current?.stop()
    session.current = undefined
    setListening(false)
  }

  const start = () => {
    settled.current = line === '' ? '' : `${line} `

    const started = dictate({
      onText: (text, final) => {
        if (final) {
          settled.current = `${settled.current}${text} `.replace(/\s+/g, ' ')
          setLine(settled.current)
        } else {
          setLine(`${settled.current}${text}`)
        }
      },
      onEnd: () => {
        session.current = undefined
        setListening(false)
      },
    })

    if (started === undefined) {
      return
    }

    session.current = started
    setListening(true)
  }

  const park = useMutation({
    mutationFn: () => parkCapture({ kind: 'manual', rawText: line.trim() }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['captures'] })
      onQueued()
    },
  })

  return (
    <Panel>
      <form
        className="space-y-4 p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          park.mutate()
        }}
      >
        <Field label="Say it">
          <TextAreaInput
            rows={4}
            value={line}
            placeholder="25k coffee at the corner shop"
            onChange={(event) => {
              setLine(event.target.value)
            }}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          {canDictate() ? (
            <Button
              tone={listening ? 'danger' : 'quiet'}
              aria-pressed={listening}
              onClick={listening ? stop : start}
            >
              {listening ? (
                <>
                  <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((bar) => (
                      <span
                        key={bar}
                        className="listening-bar bg-current w-0.5 rounded-full"
                        style={{ animationDelay: `${String(bar * 110)}ms` }}
                      />
                    ))}
                  </span>
                  Stop
                </>
              ) : (
                <>
                  <Mic className="size-4" aria-hidden="true" strokeWidth={1.75} />
                  Record
                </>
              )}
            </Button>
          ) : null}

          <Button type="submit" loading={park.isPending} disabled={line.trim().length < 3}>
            {park.isPending ? 'Queueing' : 'Queue it'}
          </Button>
        </div>

        {park.error === null ? null : (
          <Text as="p" tone="caption" className="text-danger" role="alert">
            {park.error.message}
          </Text>
        )}
      </form>
    </Panel>
  )
}
