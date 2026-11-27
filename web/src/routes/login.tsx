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
      className="mt-16 space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        signIn.mutate(password)
      }}
    >
      <h1 className="text-2xl font-semibold tracking-tight">Spenicle</h1>
      <p className="text-sm text-neutral-400">
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
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 outline-none focus:border-neutral-500"
      />
      <button
        type="submit"
        disabled={signIn.isPending}
        className="w-full rounded bg-neutral-100 px-3 py-2 font-medium text-neutral-900 disabled:opacity-50"
      >
        {signIn.isPending ? 'Signing in…' : 'Sign in'}
      </button>
      {signIn.error !== null ? (
        <p role="alert" className="text-sm text-red-400">
          {signIn.error.message}
        </p>
      ) : null}
    </form>
  )
}
