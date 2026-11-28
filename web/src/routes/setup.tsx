import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useMemo, useState } from 'react'

import { fetchMeta } from '@/api/meta'
import { changePassword } from '@/api/settings'
import { openLedger } from '@/api/setup'
import { setToken } from '@/api/token'
import type { Meta } from '@/api/types'
import { Brand } from '@/components/layouts/brand'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { Panel } from '@/components/primitives/panel'
import { PasswordInput } from '@/components/primitives/password-input'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useBootstrap } from '@/hooks/queries/use-bootstrap'
import { cn } from '@/lib/cn'

const openableKinds = [
  { label: 'Asset — cash, bank', value: 'asset' },
  { label: 'Liability — card, loan', value: 'liability' },
  { label: 'Equity', value: 'equity' },
]

/** The two steps of the wizard, named once so the rail and the eyebrow cannot drift. */
const steps = ['Claim', 'Open the ledger'] as const

/**
 * The first screen of a fresh instance, reachable without a credential. It claims the
 * password the boot wrote to the data volume, replaces it, and opens the ledger with the
 * base currency inside the same form: three fields, one button, no log to read.
 */
export function SetupPage() {
  const navigate = useNavigate()
  const boot = useBootstrap()

  const [claim, setClaim] = useState('')
  const [next, setNext] = useState('')
  const [currency, setCurrency] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountKind, setAccountKind] = useState('asset')
  const [opening, setOpening] = useState('')
  const [meta, setMeta] = useState<Meta>()

  const completed = boot.data?.setup_completed ?? false
  const claimed = meta !== undefined

  // step one only proves the generated password: the same credential the API gate demands
  const verify = useMutation({
    mutationFn: (secret: string) => fetchMeta(secret),
    onSuccess: (loaded) => {
      setMeta(loaded)
      setCurrency((current) => (current === '' ? loaded.settings.base_currency : current))
    },
  })

  const finish = useMutation({
    mutationFn: async (values: { claim: string; next: string }) => {
      const changed = await changePassword(values.claim, values.next, {
        name: 'spenicle web',
        scopes: ['admin'],
      })
      const issued = changed.token?.token
      if (issued === undefined) {
        throw new Error('the API issued no token')
      }

      setToken(issued)

      if (completed) {
        return
      }

      const openingMinor = opening.trim()
      await openLedger(values.next, {
        base_currency: currency,
        accounts:
          openingMinor === '' || accountName.trim() === ''
            ? []
            : [
                {
                  name: accountName.trim(),
                  kind: accountKind,
                  opening_balance_minor: openingMinor,
                },
              ],
      })
    },
    onSuccess: () => {
      void navigate({ to: '/ledger' })
    },
  })

  const currencyOptions = useMemo(
    () =>
      meta === undefined
        ? []
        : meta.currencies.map((entry) => ({
            label: `${entry.code} — ${entry.symbol}`,
            value: entry.code,
          })),
    [meta],
  )

  if (boot.data !== undefined && !boot.data.password_must_change) {
    return (
      <div className="mx-auto my-auto flex w-full max-w-md flex-col gap-7 py-4">
        <div className="space-y-4 text-center">
          <Brand />
          <Text as="h1" tone="display">
            Already claimed
          </Text>
          <Text as="p" tone="muted">
            This instance has its own password. Sign in with it.
          </Text>
        </div>
        <Panel className="p-6 sm:p-8">
          <Button size="lg" block onClick={() => void navigate({ to: '/' })}>
            Go to sign in
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto my-auto flex w-full max-w-lg flex-col gap-7 py-4">
      <div className="space-y-5 text-center">
        <Brand />
        <div className="space-y-3">
          <Text as="h1" tone="display">
            {claimed ? 'Open the ledger' : 'Claim this instance'}
          </Text>
          <Text as="p" tone="muted" className="mx-auto max-w-sm leading-relaxed">
            {claimed
              ? completed
                ? 'Choose the password this instance will answer to.'
                : 'Choose the currency the whole ledger is kept in. It locks once you continue.'
              : 'The first boot wrote a password into ./data/first-boot.txt on the data volume. Paste it here — it is replaced in the next step and the file is deleted.'}
          </Text>
        </div>
      </div>

      <ol
        className="text-ink-400 font-mono flex items-center justify-center gap-3 text-[0.625rem] font-medium tracking-[0.18em] uppercase"
        aria-label="Setup progress"
      >
        {steps.map((step, index) => {
          const current = index === (claimed ? 1 : 0)
          const done = index === 0 && claimed

          return (
            <li
              key={step}
              aria-current={current ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2',
                current && 'text-brass-300',
                done && 'text-ink-300',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-5 place-items-center rounded-full border text-[0.625rem]',
                  current && 'border-brass-500 text-brass-300',
                  done && 'border-ink-600 text-ink-300',
                  !current && !done && 'border-ink-700 text-ink-500',
                )}
              >
                {done ? <Check className="size-2.5" strokeWidth={3} /> : index + 1}
              </span>
              {step}
              {index === 0 ? <span aria-hidden="true" className="bg-ink-700 h-px w-6" /> : null}
            </li>
          )
        })}
      </ol>

      <Panel className="p-6 sm:p-8">
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (!claimed) {
              verify.mutate(claim.trim())

              return
            }

            finish.mutate({ claim: claim.trim(), next })
          }}
        >
          {claimed ? null : (
            <Field
              label="First-boot password"
              hint="Read it with: docker exec <container> cat /data/first-boot.txt"
              error={verify.error?.message}
            >
              <PasswordInput
                name="claim"
                value={claim}
                autoComplete="current-password"
                placeholder="Paste the generated password…"
                onChange={(event) => {
                  setClaim(event.target.value)
                }}
              />
            </Field>
          )}

          {claimed ? (
            <>
              <div className="space-y-5">
                <Text as="p" tone="section">
                  Your password
                </Text>
                <Field
                  label="New password"
                  hint="At least 12 characters. Nobody else gets this password."
                  error={finish.error?.message}
                >
                  <PasswordInput
                    name="new-password"
                    value={next}
                    autoComplete="new-password"
                    placeholder="Twelve characters or more…"
                    onChange={(event) => {
                      setNext(event.target.value)
                    }}
                  />
                </Field>
              </div>

              {completed ? null : (
                <div className="border-ink-800 space-y-5 border-t pt-6">
                  <Text as="p" tone="section">
                    The ledger
                  </Text>
                  <Field label="Base currency" hint="Every balance is reported in it.">
                    <SelectInput
                      value={currency}
                      options={currencyOptions}
                      placeholder="choose a currency…"
                      onChange={setCurrency}
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Opening account" hint="Optional. The account you already hold.">
                      <TextInput
                        name="account-name"
                        value={accountName}
                        placeholder="Cash…"
                        onChange={(event) => {
                          setAccountName(event.target.value)
                        }}
                      />
                    </Field>
                    <Field label="Kind">
                      <SelectInput
                        value={accountKind}
                        options={openableKinds}
                        onChange={setAccountKind}
                      />
                    </Field>
                  </div>

                  <Field
                    label="Opening balance"
                    hint="Minor units, absolute: 500000 is 5,000.00 in a two-decimal currency."
                  >
                    <TextInput
                      name="opening-minor"
                      value={opening}
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0"
                      onChange={(event) => {
                        setOpening(event.target.value)
                      }}
                    />
                  </Field>
                </div>
              )}
            </>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center">
            {claimed ? (
              <Button
                tone="ghost"
                size="lg"
                leadingIcon={ArrowLeft}
                className="sm:w-auto"
                onClick={() => {
                  setMeta(undefined)
                  setNext('')
                }}
              >
                Back
              </Button>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              loading={verify.isPending || finish.isPending}
              trailingIcon={ArrowRight}
              disabled={
                claim === '' || (claimed && (next.length < 12 || (!completed && currency === '')))
              }
            >
              {claimed ? 'Save and open' : 'Continue'}
            </Button>
          </div>
        </form>
      </Panel>

      <Text as="p" tone="caption" className="text-center">
        The generated password is deleted the moment yours is saved.
      </Text>
    </div>
  )
}
