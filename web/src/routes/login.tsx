import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'

import { api } from '@/api/client'
import { apiError, isApiError } from '@/api/error'
import { Gate } from '@/components/layouts'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { PasswordInput } from '@/components/primitives/password-input'
import { Text } from '@/components/primitives/text'
import { useApp, useAuth } from '@/providers'

/**
 * The password never leaves this form: it is exchanged for a scoped token, and only the token is
 * kept. A leaked browser credential is therefore revocable, not root.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const { bootstrap } = useApp()
  const auth = useAuth()
  const [password, setPassword] = useState('')

  const signIn = useMutation({
    mutationFn: async (secret: string) => {
      const { data, error, response } = await api.POST('/api/tokens', {
        headers: { Authorization: `Bearer ${secret}` },
        body: { name: 'spenicle web', scopes: ['admin'] },
      })

      if (error !== undefined) {
        throw apiError(response.status, error)
      }

      return data
    },
    onError: (error) => {
      // an instance claimed by an earlier build answers with its own code: the fix is the wizard
      if (isApiError(error) && error.code === 'password_change_required') {
        void navigate({ to: '/setup' })
      }
    },
    onSuccess: (issued) => {
      if (issued.token === undefined) {
        throw new Error('the API issued no token')
      }

      auth.signIn(issued.token)
      void navigate({ to: '/dashboard' })
    },
  })

  return (
    <Gate
      title="Sign in"
      description="One password opens this instance. It buys a scoped token for this tab and is never stored, so signing out is enough to end the session."
      aside={
        <dl className="text-text-muted grid max-w-xs grid-cols-2 gap-3 text-xs">
          <Fact label="Currency" value={bootstrap.base_currency} />
          <Fact label="Timezone" value={bootstrap.timezone} />
        </dl>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          signIn.mutate(password.trim())
        }}
      >
        <Field label="Instance password" error={signIn.error?.message}>
          <PasswordInput
            name="password"
            placeholder="Instance password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
            }}
          />
        </Field>
        <Button
          type="submit"
          size="lg"
          block
          loading={signIn.isPending}
          trailingIcon={ArrowRight}
          disabled={password.trim() === ''}
        >
          {signIn.isPending ? 'Unlocking' : 'Unlock'}
        </Button>
      </form>

      <Text as="p" tone="caption" className="mt-5 block text-center">
        {bootstrap.claimable ? (
          <>
            This instance has never been set up.{' '}
            <Link
              to="/setup"
              className="text-text decoration-border hover:text-accent underline underline-offset-4"
            >
              Claim it
            </Link>
          </>
        ) : (
          'The ledger is local. Nothing leaves this container.'
        )}
      </Text>
    </Gate>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-text-faint text-[0.5625rem] tracking-[0.16em] uppercase">{label}</dt>
      <dd className="text-text font-mono text-xs">{value}</dd>
    </div>
  )
}
