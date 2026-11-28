import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { changePassword } from '@/api/settings'
import { queryClient } from '@/api/query'
import type { TokenIssued } from '@/api/types'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { Panel } from '@/components/primitives/panel'
import { PasswordInput } from '@/components/primitives/password-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useCreateToken, useRevokeToken, useTokenList } from '@/hooks/queries/use-tokens'
import { useSettings } from '@/hooks/queries/use-settings'

/** The instance itself: what the ledger is kept in, who holds a credential, and how to rotate it. */
export function SettingsPage() {
  const settings = useSettings()
  const tokens = useTokenList()
  const revoke = useRevokeToken()
  const create = useCreateToken()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [tokenName, setTokenName] = useState('')
  const [tokenScopes, setTokenScopes] = useState('admin')
  const [root, setRoot] = useState('')
  const [issued, setIssued] = useState<TokenIssued>()

  const rotate = useMutation({
    mutationFn: () => changePassword(current, next),
    onSuccess: async () => {
      setCurrent('')
      setNext('')
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const mint = useMutation({
    mutationFn: () =>
      create.mutateAsync({
        body: {
          name: tokenName,
          scopes: tokenScopes
            .split(',')
            .map((scope) => scope.trim())
            .filter((scope) => scope !== ''),
        },
        credential: root,
      }),
    onSuccess: (token) => {
      setIssued(token)
      setTokenName('')
    },
  })

  const rows = tokens.data?.tokens ?? []

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Text as="p" tone="section">
          Settings
        </Text>
        <Text as="h1" tone="display">
          This instance
        </Text>
        <Text as="p" tone="muted">
          One household, one ledger, one password. Nothing here is shared with anyone else.
        </Text>
      </header>

      <Panel className="divide-ink-800 divide-y">
        <section className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          {[
            {
              label: 'Base currency',
              value: settings.data?.base_currency ?? '—',
              locked: 'locked',
            },
            { label: 'Timezone', value: settings.data?.timezone ?? '—', locked: 'set at boot' },
            {
              label: 'Extraction',
              value: settings.data?.extraction_enabled === true ? 'wired' : 'manual entry',
              locked: 'from the environment',
            },
          ].map((item) => (
            <div key={item.label} className="space-y-1">
              <Text as="p" tone="section">
                {item.label}
              </Text>
              <Text as="p" tone="figure" className="text-porcelain-100">
                {item.value}
              </Text>
              <Text as="p" tone="caption">
                {item.locked}
              </Text>
            </div>
          ))}
        </section>

        <section className="space-y-4 p-5 sm:p-6">
          <Text as="p" tone="section">
            Password
          </Text>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              rotate.mutate()
            }}
          >
            <Field label="Current password" error={rotate.error?.message}>
              <PasswordInput
                name="current-password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => {
                  setCurrent(event.target.value)
                }}
              />
            </Field>
            <Field label="New password" hint="At least 12 characters.">
              <PasswordInput
                name="new-password"
                autoComplete="new-password"
                value={next}
                onChange={(event) => {
                  setNext(event.target.value)
                }}
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={rotate.isPending} disabled={next.length < 12}>
                {rotate.isPending ? 'Saving…' : 'Rotate password'}
              </Button>
              {rotate.isSuccess ? (
                <Text as="p" tone="caption" className="text-jade-300 pt-2">
                  Password replaced. Every token minted from the old one keeps working; this tab
                  still uses the token it already holds.
                </Text>
              ) : null}
            </div>
          </form>
        </section>

        <section className="space-y-4 p-5 sm:p-6">
          <Text as="p" tone="section">
            Tokens
          </Text>

          {rows.length === 0 ? (
            <Text as="p" tone="muted">
              No token yet. Mint one below and hand it to a script instead of the password.
            </Text>
          ) : (
            <ul>
              {rows.map((row) => (
                <li
                  key={row.ref}
                  className="border-ink-800/70 flex flex-wrap items-baseline gap-3 border-t py-3 text-sm first:border-t-0"
                >
                  <span className="text-porcelain-100 min-w-0 flex-1 truncate">{row.name}</span>
                  <Text as="span" tone="code" className="text-ink-400">
                    {row.preview}
                  </Text>
                  <Text as="span" tone="caption" className="text-ink-500">
                    {row.scopes?.join(', ') ?? ''}
                  </Text>
                  {row.revoked_at === undefined ? (
                    <Button
                      tone="danger"
                      size="sm"
                      onClick={() => {
                        revoke.mutate(row.ref ?? '')
                      }}
                    >
                      Revoke
                    </Button>
                  ) : (
                    <Text as="span" tone="caption" className="text-ink-500">
                      revoked
                    </Text>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              mint.mutate()
            }}
          >
            <Field label="Name" error={mint.error?.message}>
              <TextInput
                name="token-name"
                placeholder="script, cron, phone…"
                value={tokenName}
                onChange={(event) => {
                  setTokenName(event.target.value)
                }}
              />
            </Field>
            <Field label="Scopes" hint="Comma separated; admin covers all.">
              <TextInput
                name="token-scopes"
                value={tokenScopes}
                onChange={(event) => {
                  setTokenScopes(event.target.value)
                }}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Password" hint="Minting needs the root credential; it is not stored.">
                <PasswordInput
                  name="root-password"
                  autoComplete="current-password"
                  value={root}
                  onChange={(event) => {
                    setRoot(event.target.value)
                  }}
                />
              </Field>
            </div>
            <div>
              <Button
                type="submit"
                tone="quiet"
                loading={mint.isPending}
                disabled={tokenName === '' || root === ''}
              >
                Mint token
              </Button>
            </div>
          </form>

          {issued?.token === undefined ? null : (
            <div className="border-ink-800 space-y-1 rounded-md border p-4">
              <Text as="p" tone="section">
                Copy it now
              </Text>
              <Text as="p" tone="code" className="break-all">
                {issued.token}
              </Text>
              <Text as="p" tone="caption">
                The plaintext exists once. Only its digest and the preview above are stored.
              </Text>
            </div>
          )}
        </section>
      </Panel>
    </div>
  )
}
