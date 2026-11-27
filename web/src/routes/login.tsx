import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { api, errorMessage } from '@/api/client'
import { setToken } from '@/api/token'

/**
 * The password never leaves the page: it is exchanged for a scoped token, and only
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
      className="mx-auto mt-20 max-w-sm space-y-5 rounded-lg border border-border bg-surface-raised p-8 shadow-[0_1px_0_0_var(--color-brass-800)]"
      onSubmit={(event) => {
        event.preventDefault()
        signIn.mutate(password)
      }}
    >
      <h1 className="text-3xl font-semibold text-porcelain-50">Spenicle</h1>
      <p className="text-sm leading-relaxed text-text-muted">
        Sign in with the instance password. It is exchanged for a scoped token and never stored.
      </p>
      <input
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => {
          setPassword(event.target.value)
        }}
        placeholder="Instance password"
        className="w-full rounded border border-border bg-surface px-3 py-2 text-text outline-none transition-colors placeholder:text-ink-400 focus:border-accent focus:ring-2 focus:ring-accent/25"
      />
      <button
        type="submit"
        disabled={signIn.isPending}
        className="w-full rounded bg-primary px-3 py-2 font-medium text-porcelain-50 transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {signIn.isPending ? 'Signing in…' : 'Sign in'}
      </button>
      {signIn.error !== null ? (
        <p role="alert" className="text-sm text-danger">
          {signIn.error.message}
        </p>
      ) : null}
    </form>
  )
}
