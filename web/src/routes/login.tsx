import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { api } from '@/api/client'
import { apiError, isApiError } from '@/api/error'
import { changePassword } from '@/api/settings'
import { setToken } from '@/api/token'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { PasswordInput } from '@/components/primitives/password-input'
import { Text } from '@/components/primitives/text'

/**
 * The password never leaves this form: it is exchanged for a scoped token, and only
 * the token is kept. A leaked browser credential is therefore revocable, not root.
 */
export function LoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [next, setNext] = useState('')

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
    onSuccess: (issued) => {
      if (issued.token === undefined) {
        throw new Error('the API issued no token')
      }

      setToken(issued.token)
      void navigate({ to: '/ledger' })
    },
  })

  const swap = useMutation({
    mutationFn: async (values: { current: string; next: string }) =>
      changePassword(values.current, values.next),
    onSuccess: () => {
      signIn.mutate(next)
    },
  })

  // a fresh instance refuses every credential until its generated password is replaced: that is
  // not a failed sign-in, it is the first thing this screen has to ask for
  if (isApiError(signIn.error) && signIn.error.code === 'password_change_required') {
    return (
      <form
        className="border-border bg-surface-raised mx-auto mt-20 max-w-sm space-y-5 rounded-lg border p-8 shadow-[0_1px_0_0_var(--color-brass-800)]"
        onSubmit={(event) => {
          event.preventDefault()
          swap.mutate({ current: password, next })
        }}
      >
        <div className="space-y-2">
          <Text as="h1" tone="display">
            Set a password
          </Text>
          <Text as="p" tone="muted" className="leading-relaxed">
            This instance still uses the password it generated on first boot. Replace it to continue
            — at least 12 characters.
          </Text>
        </div>
        <Field label="Generated password" hint="It is in the first boot log line.">
          <PasswordInput
            value={password}
            autoComplete="current-password"
            onChange={(event) => {
              setPassword(event.target.value)
            }}
          />
        </Field>
        <Field label="New password" error={swap.error?.message}>
          <PasswordInput
            value={next}
            autoComplete="new-password"
            onChange={(event) => {
              setNext(event.target.value)
            }}
          />
        </Field>
        <Button type="submit" block disabled={swap.isPending || next.length < 12}>
          {swap.isPending ? 'Saving…' : 'Save and sign in'}
        </Button>
      </form>
    )
  }

  return (
    <form
      className="border-border bg-surface-raised mx-auto mt-20 max-w-sm space-y-5 rounded-lg border p-8 shadow-[0_1px_0_0_var(--color-brass-800)]"
      onSubmit={(event) => {
        event.preventDefault()
        signIn.mutate(password)
      }}
    >
      <div className="space-y-2">
        <Text as="h1" tone="display">
          Spenicle
        </Text>
        <Text as="p" tone="muted" className="leading-relaxed">
          Sign in with the instance password. It is exchanged for a scoped token and never stored.
        </Text>
      </div>
      <Field
        label="Instance password"
        hint="Only the token is kept, in this tab."
        error={signIn.error?.message}
      >
        <PasswordInput
          placeholder="Instance password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
          }}
        />
      </Field>
      <Button type="submit" block disabled={signIn.isPending}>
        {signIn.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
