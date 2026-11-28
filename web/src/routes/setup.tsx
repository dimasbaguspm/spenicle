import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { api } from '@/api/client'
import { apiError } from '@/api/error'
import { openLedger } from '@/api/setup'
import { Brand } from '@/components/layouts/brand'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { Panel } from '@/components/primitives/panel'
import { PasswordInput } from '@/components/primitives/password-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useApp, useAuth } from '@/providers'

/** An ISO 4217 code as a person types it: three letters, no digits, no dashes. */
const currencyCode = /^[A-Z]{3}$/

/**
 * The claim screen. A fresh instance boots open — there is no password to recover and no
 * generated one to read — so this one form is what closes it: choose the password, choose the
 * currency, and the instance is yours.
 *
 * `GET /api/bootstrap` is the whole input: it is the one read that needs no credential, and it
 * carries `claimable` and the server's default currency. Nothing here reads `/api/meta` — that
 * route sits behind a token, and a moment before the claim there is none to send.
 */
export function SetupPage() {
  const navigate = useNavigate()
  const { bootstrap } = useApp()
  const auth = useAuth()

  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState(bootstrap.base_currency)

  const finish = useMutation({
    mutationFn: async () => {
      await openLedger({ password, base_currency: currency })

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
      <Shell
        title="Already claimed"
        description="This instance has its own password. Sign in with it."
      >
        <Button size="lg" block onClick={() => void navigate({ to: '/' })}>
          Go to sign in
        </Button>
      </Shell>
    )
  }

  const ready = password.length >= 12 && currencyCode.test(currency)

  return (
    <Shell
      title="Claim this instance"
      description="Nobody has set this instance up yet, so it is open. Choose a password and the currency the ledger will be kept in. That closes it."
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          finish.mutate()
        }}
      >
        <div className="space-y-5">
          <Text as="p" tone="section">
            Your password
          </Text>
          <Field
            label="Instance password"
            hint="At least 12 characters. It is the root credential; a token is minted from it after this."
            error={finish.error?.message}
          >
            <PasswordInput
              name="new-password"
              value={password}
              autoComplete="new-password"
              placeholder="Twelve characters or more…"
              onChange={(event) => {
                setPassword(event.target.value)
              }}
            />
          </Field>
        </div>

        <div className="border-border space-y-5 border-t pt-6">
          <Text as="p" tone="section">
            The ledger
          </Text>
          <Field
            label="Base currency"
            hint="An ISO 4217 code such as USD or IDR. Set once: every balance is reported in it, and no request can change it later."
          >
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
        </div>

        <Button
          type="submit"
          size="lg"
          block
          loading={finish.isPending}
          trailingIcon={ArrowRight}
          disabled={!ready}
        >
          {finish.isPending ? 'Claiming…' : 'Claim and open'}
        </Button>
      </form>
    </Shell>
  )
}

/** The header, the plate and the footer line every state of this screen shares. */
function Shell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto my-auto flex w-full max-w-lg flex-col gap-7 py-4">
      <div className="space-y-5 text-center">
        <Brand />
        <div className="space-y-3">
          <Text as="h1" tone="display">
            {title}
          </Text>
          <Text as="p" tone="muted" className="mx-auto max-w-md leading-relaxed">
            {description}
          </Text>
        </div>
      </div>
      <Panel className="p-5 sm:p-7">{children}</Panel>
    </div>
  )
}
