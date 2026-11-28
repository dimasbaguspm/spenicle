import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'

import { api } from '@/api/client'
import { apiError, isApiError } from '@/api/error'
import { setToken } from '@/api/token'
import { Brand } from '@/components/layouts/brand'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { Panel } from '@/components/primitives/panel'
import { PasswordInput } from '@/components/primitives/password-input'
import { Text } from '@/components/primitives/text'
import { useBootstrap } from '@/hooks/queries/use-bootstrap'

/**
 * The password never leaves this form: it is exchanged for a scoped token, and only
 * the token is kept. A leaked browser credential is therefore revocable, not root.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const boot = useBootstrap()
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
      // a fresh instance refuses every credential until its generated password is replaced:
      // that is not a failed sign-in, it is the setup wizard's job, and it is one link away
      if (isApiError(error) && error.code === 'password_change_required') {
        void navigate({ to: '/setup' })
      }
    },
    onSuccess: (issued) => {
      if (issued.token === undefined) {
        throw new Error('the API issued no token')
      }

      setToken(issued.token)
      void navigate({ to: '/ledger' })
    },
  })

  const claimable = boot.data?.password_must_change === true || boot.data?.setup_completed === false

  return (
    <div className="mx-auto my-auto flex w-full max-w-md flex-col gap-7 py-4">
      <div className="space-y-5 text-center">
        <Brand />
        <div className="space-y-3">
          <Text as="h1" tone="display">
            Sign in
          </Text>
          <Text as="p" tone="muted" className="mx-auto max-w-sm leading-relaxed">
            One password opens this instance. It is exchanged for a scoped token and never stored.
          </Text>
        </div>
      </div>

      <Panel className="p-6 sm:p-8">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault()
            signIn.mutate(password.trim())
          }}
        >
          <Field
            label="Instance password"
            hint="Only the token is kept, and only in this tab."
            error={signIn.error?.message}
          >
            <PasswordInput
              name="password"
              placeholder="Your instance password…"
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
          >
            {signIn.isPending ? 'Unlocking…' : 'Unlock'}
          </Button>
        </form>
      </Panel>

      {claimable ? (
        <div className="border-brass-700/50 space-y-2 border-l pl-5">
          <Text as="p" tone="section">
            First boot
          </Text>
          <Text as="p" tone="muted" className="leading-relaxed">
            Claim this instance with the password the boot wrote to{' '}
            <Text as="code" tone="code">
              ./data/first-boot.txt
            </Text>
            , then choose your own.{' '}
            <Link
              to="/setup"
              className="text-brass-300 decoration-brass-700 underline underline-offset-4 hover:text-brass-200"
            >
              Open setup…
            </Link>
          </Text>
        </div>
      ) : (
        <Text as="p" tone="caption" className="text-center">
          The ledger is local. Nothing leaves this container.
        </Text>
      )}
    </div>
  )
}
