import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'

import { api } from '@/api/client'
import { apiError } from '@/api/error'
import { openLedger } from '@/api/setup'
import { Gate } from '@/components/layouts'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { PasswordInput } from '@/components/primitives/password-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useApp, useAuth } from '@/providers'

/** An ISO 4217 code as a person types it: three letters, no digits, no dashes. */
const currencyCode = /^[A-Z]{3}$/

/**
 * The claim screen. A fresh instance boots open, so this form is what closes it: a password, the
 * currency the ledger will be kept in, and optionally one account to start from.
 *
 * `GET /api/bootstrap` is the whole input: the one read that needs no credential. Nothing here
 * reads `/api/meta` — that route sits behind a token, and a moment before the claim there is none.
 */
export function SetupPage() {
  const navigate = useNavigate()
  const { bootstrap } = useApp()
  const auth = useAuth()

  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState(bootstrap.base_currency)
  const [account, setAccount] = useState('')
  const [opening, setOpening] = useState('')

  const finish = useMutation({
    mutationFn: async () => {
      await openLedger({
        password,
        base_currency: currency,
        ...(account.trim() === ''
          ? {}
          : {
              accounts: [
                {
                  kind: 'asset',
                  name: account.trim(),
                  opening_balance_minor: opening.trim() === '' ? '0' : opening.trim(),
                },
              ],
            }),
      })

      // the instance is closed now, so the browser still needs a credential of its own
      const { data, error, response } = await api.POST('/api/tokens', {
        headers: { Authorization: `Bearer ${password}` },
        body: { name: 'spenicle web', scopes: ['admin'] },
      })

      if (error !== undefined) {
        throw apiError(response.status, error)
      }

      if (data.token === undefined) {
        throw new Error('the API issued no token')
      }

      auth.signIn(data.token)
    },
    onSuccess: () => {
      void navigate({ to: '/dashboard' })
    },
  })

  // a claimed instance has nothing to set up: the screen is a dead end, so it says so.
  // `claimable` is the fact, not the marker: an instance claimed by an earlier build carries a
  // password but no completion row, and the API refuses the claim all the same.
  if (!bootstrap.claimable) {
    return (
      <Gate
        title="Already claimed"
        description="This instance has its own password, so there is nothing left to set up here."
      >
        <Button size="lg" onClick={() => void navigate({ to: '/' })}>
          Go to sign in
        </Button>
      </Gate>
    )
  }

  // an account without a balance is not an opening balance: the API wants nonzero minor units
  const openingOk = account.trim() === '' || /^-?[0-9]+$/.test(opening.trim())
  const ready = password.length >= 12 && currencyCode.test(currency) && openingOk && opening !== '0'

  return (
    <Gate
      title="Claim this instance"
      description="Nobody has set this instance up, so it is open to whoever gets here first. Name a password, pick the currency the ledger is kept in, and it is yours."
      aside={
        <ol className="text-text-muted max-w-xs space-y-2 text-xs">
          <li>1. The password becomes the root credential.</li>
          <li>2. The currency is locked: every balance is reported in it.</li>
          <li>3. The account is optional and can be added later.</li>
        </ol>
      }
    >
      <form
        className="space-y-7"
        onSubmit={(event) => {
          event.preventDefault()
          finish.mutate()
        }}
      >
        <section className="space-y-4">
          <Step label="Password" />
          <Field label="Instance password" error={finish.error?.message}>
            <PasswordInput
              name="new-password"
              value={password}
              autoComplete="new-password"
              placeholder="Twelve characters or more"
              onChange={(event) => {
                setPassword(event.target.value)
              }}
            />
          </Field>
        </section>

        <section className="border-border space-y-4 border-t pt-6">
          <Step label="The ledger" />
          <Field label="Base currency">
            <TextInput
              name="base-currency"
              value={currency}
              maxLength={3}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="USD"
              className="font-mono tracking-[0.2em] uppercase"
              onChange={(event) => {
                setCurrency(event.target.value.trim().toUpperCase())
              }}
            />
          </Field>
        </section>

        <section className="border-border space-y-4 border-t pt-6">
          <Step label="An account to start with" optional />
          <Field label="Name">
            <TextInput
              name="opening-account"
              value={account}
              autoComplete="off"
              placeholder="Cash"
              onChange={(event) => {
                setAccount(event.target.value)
              }}
            />
          </Field>

          <Field
            label="Opening balance"
            error={openingOk ? undefined : 'digits only, with a leading minus when it is a debt'}
          >
            <TextInput
              name="opening-balance"
              value={opening}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              className="font-mono"
              onChange={(event) => {
                setOpening(event.target.value.trim())
              }}
            />
          </Field>
          <Text as="p" tone="caption" className="text-text-faint">
            In minor units: 100000 is 1,000.00 in a two-decimal currency.
          </Text>
        </section>

        <Button
          type="submit"
          size="lg"
          block
          loading={finish.isPending}
          trailingIcon={ArrowRight}
          disabled={!ready}
        >
          {finish.isPending ? 'Claiming' : 'Claim and open'}
        </Button>
      </form>
    </Gate>
  )
}

/** A numbered step: the plate is one form, but the claim is three decisions in order. */
function Step({ label, optional = false }: { label: string; optional?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <Text as="p" tone="section">
        {label}
      </Text>
      {optional ? (
        <Text as="p" tone="caption" className="text-text-faint">
          optional
        </Text>
      ) : null}
    </div>
  )
}
