import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { changePassword } from '@/api/settings'
import { queryClient } from '@/api/query'
import type { TokenIssued } from '@/api/types'
import { Button } from '@/components/primitives/button'
import { ThemeToggle } from '@/components/layouts/theme-toggle'
import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Field } from '@/components/primitives/field'
import { Panel } from '@/components/primitives/panel'
import { PasswordInput } from '@/components/primitives/password-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useSettings } from '@/hooks/queries/use-settings'
import { useCreateToken, useRevokeToken, useTokenList } from '@/hooks/queries/use-tokens'
import { useAuth } from '@/providers'
import { SettingsFacts, TokenList } from '@/modules'

/** The instance itself: what the ledger is kept in, who holds a credential, and how to rotate it. */
/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const settingsCrumbs = [{ label: 'Settings' }] as const

export function SettingsPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const settings = useSettings()
  const tokens = useTokenList()
  const remove = useRevokeToken()
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
        <Breadcrumb items={settingsCrumbs} />
      </header>

      <Panel className="divide-border divide-y">
        <SettingsFacts settings={settings.data} />

        <section className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-1">
            <Text as="p" tone="section">
              Appearance
            </Text>
            <Text as="p" tone="muted" className="text-sm">
              Light, dark, or whatever this client asks for. The choice is kept in this browser.
            </Text>
          </div>
          <ThemeToggle />
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
                <Text as="p" tone="caption" className="text-success pt-2">
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
            <TokenList
              tokens={rows}
              revoking={remove.isPending}
              onRevoke={(ref) => {
                remove.mutate(ref)
              }}
            />
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
            <div className="border-border space-y-1 rounded-md border p-4">
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

        <section className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-1">
            <Text as="p" tone="section">
              Session
            </Text>
            <Text as="p" tone="muted" className="text-sm">
              Signing out drops this tab's token. The tokens above keep working.
            </Text>
          </div>
          <Button
            tone="danger"
            size="sm"
            onClick={() => {
              signOut()
              void navigate({ to: '/' })
            }}
          >
            Sign out
          </Button>
        </section>
      </Panel>
    </div>
  )
}
