import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { fetchMeta } from '@/api/meta'
import { changePassword } from '@/api/settings'
import { openLedger } from '@/api/setup'
import { setToken } from '@/api/token'
import type { Meta } from '@/api/types'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { PasswordInput } from '@/components/primitives/password-input'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useBootstrap } from '@/hooks/queries/use-bootstrap'

const openableKinds = [
  { label: 'Asset (cash, bank)', value: 'asset' },
  { label: 'Liability (card, loan)', value: 'liability' },
  { label: 'Equity', value: 'equity' },
]

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
      <form
        className="border-border bg-surface-raised mx-auto mt-20 max-w-sm space-y-5 rounded-lg border p-8 shadow-[0_1px_0_0_var(--color-brass-800)]"
        onSubmit={(event) => {
          event.preventDefault()
          void navigate({ to: '/' })
        }}
      >
        <div className="space-y-2">
          <Text as="h1" tone="display">
            Already claimed
          </Text>
          <Text as="p" tone="muted" className="leading-relaxed">
            This instance has its own password. Sign in with it.
          </Text>
        </div>
        <Button type="submit" block>
          Go to sign in
        </Button>
      </form>
    )
  }

  return (
    <form
      className="border-border bg-surface-raised mx-auto mt-20 max-w-sm space-y-5 rounded-lg border p-8 shadow-[0_1px_0_0_var(--color-brass-800)]"
      onSubmit={(event) => {
        event.preventDefault()
        if (meta === undefined) {
          verify.mutate(claim)

          return
        }

        finish.mutate({ claim, next })
      }}
    >
      <div className="space-y-2">
        <Text as="h1" tone="display">
          {meta === undefined ? 'Claim this instance' : 'Open the ledger'}
        </Text>
        <Text as="p" tone="muted" className="leading-relaxed">
          {meta === undefined
            ? 'The first boot wrote a password into ./data/first-boot.txt on the data volume. Paste it here — it is replaced in the next step and the file is deleted.'
            : completed
              ? 'Choose the password this instance will answer to.'
              : 'Choose the currency the whole ledger is kept in. It locks once you continue.'}
        </Text>
      </div>

      <Field
        label="First-boot password"
        hint="It is ./data/first-boot.txt, inside the container's data volume."
        error={verify.error?.message}
      >
        <PasswordInput
          value={claim}
          autoComplete="current-password"
          onChange={(event) => {
            setClaim(event.target.value)
          }}
        />
      </Field>

      {meta === undefined ? null : (
        <>
          <Field label="New password" hint="At least 12 characters." error={finish.error?.message}>
            <PasswordInput
              value={next}
              autoComplete="new-password"
              onChange={(event) => {
                setNext(event.target.value)
              }}
            />
          </Field>

          {completed ? null : (
            <>
              <Field label="Base currency">
                <SelectInput value={currency} options={currencyOptions} onChange={setCurrency} />
              </Field>
              <Field
                label="Opening account"
                hint="Optional. The name and the amount you already hold in it."
              >
                <TextInput
                  value={accountName}
                  placeholder="Cash"
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
              <Field
                label="Opening balance (minor units)"
                hint="Absolute amount in the base currency, e.g. 500000 for 5,000.00."
              >
                <TextInput
                  value={opening}
                  inputMode="numeric"
                  placeholder="0"
                  onChange={(event) => {
                    setOpening(event.target.value)
                  }}
                />
              </Field>
            </>
          )}
        </>
      )}

      <Button
        type="submit"
        block
        loading={verify.isPending || finish.isPending}
        disabled={
          claim === '' ||
          (meta !== undefined && (next.length < 12 || (!completed && currency === '')))
        }
      >
        {meta === undefined ? 'Continue' : 'Save and open'}
      </Button>
    </form>
  )
}
