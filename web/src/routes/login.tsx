import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { api, errorMessage } from '@/api/client'
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

  const signIn = useMutation({
    mutationFn: async (secret: string) => {
      const { data, error, response } = await api.POST('/api/tokens', {
        headers: { Authorization: `Bearer ${secret}` },
        body: { name: 'spenicle web', scopes: ['admin'] },
      })

      if (error !== undefined) {
        throw new Error(errorMessage(error, response.status))
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
