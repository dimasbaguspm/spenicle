import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

import { api } from '@/api/client'
import { apiError, isApiError } from '@/api/error'
import { fetchMeta } from '@/api/meta'
import { openLedger } from '@/api/setup'
import { Brand } from '@/components/layouts/brand'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { Panel } from '@/components/primitives/panel'
import { PasswordInput } from '@/components/primitives/password-input'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { useApp, useAuth } from '@/providers'

/**
 * The claim screen. A fresh instance boots open — there is no password to recover and
 * no generated one to read — so this one form is what closes it: choose the password,
 * choose the currency, optionally open a first account, and the instance is yours.
 *
 * `GET /api/bootstrap` is the only thing that decides whether this screen or the
 * sign-in screen is shown, and it is the one read that needs no credential.
 */
export function SetupPage() {
  const navigate = useNavigate()
  const { bootstrap } = useApp()
  const auth = useAuth()

  const [password, setPassword] = useState('')
  const [currency, setCurrency] = useState('')

  const meta = useQuery({ queryKey: ['meta'], queryFn: () => fetchMeta() })

  // a claimed instance has nothing to set up: the screen is a dead end, so it says so.
  // A password without a completed setup reaches the same answer through the 401 below.
  // Any other failure is not a claim: the form stays and shows what the API said.
  const unauthorized = isApiError(meta.error) && meta.error.status === 401
  const claimed = bootstrap.setup_completed === true || unauthorized

  const chooseCurrency = useMemo(
    () =>
      meta.data === undefined
        ? []
        : meta.data.currencies.map((entry) => ({
            label: `${entry.code} — ${entry.symbol}`,
            value: entry.code,
          })),
    [meta.data],
  )

  const chosenCurrency = currency === '' ? (meta.data?.settings.base_currency ?? '') : currency

  const finish = useMutation({
    mutationFn: async () => {
      await openLedger({ password, base_currency: chosenCurrency })

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

  if (claimed) {
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

  const metaError = meta.isError ? meta.error.message : undefined

  return (
    <Shell
      title="Claim this instance"
      description="Nobody has set this instance up yet, so it is open. Choose a password and the currency the ledger will be kept in — that closes it."
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

        <div className="border-ink-800 space-y-5 border-t pt-6">
          <Text as="p" tone="section">
            The ledger
          </Text>
          <Field
            label="Base currency"
            hint="Set once: every balance is reported in it, and no request can change it later."
          >
            <SelectInput
              value={chosenCurrency}
              options={chooseCurrency}
              placeholder="choose a currency…"
              onChange={setCurrency}
            />
          </Field>
        </div>

        <Button
          type="submit"
          size="lg"
          block
          loading={finish.isPending}
          trailingIcon={ArrowRight}
          disabled={password.length < 12 || chosenCurrency === ''}
        >
          {finish.isPending ? 'Claiming…' : 'Claim and open'}
        </Button>

        {metaError === undefined ? null : (
          <Text as="p" tone="caption" className="text-oxblood-300" role="alert">
            {metaError}
          </Text>
        )}
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
