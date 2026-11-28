import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import type { TokenIssued } from '@/api/types'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { PasswordInput } from '@/components/primitives/password-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useCreateToken, useRevokeToken, useTokenList } from '@/hooks/queries/use-tokens'
import { TokenList } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const crumbs = [{ label: 'Settings', to: '/settings' }, { label: 'API tokens' }] as const

/**
 * A token is a named, scoped credential, and its plaintext exists exactly once. Minting is the one
 * call the instance password authorises, so the password field is part of the form and is never
 * stored: the header outranks the token this tab already holds.
 */
export function TokensPage() {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState('admin')
  const [root, setRoot] = useState('')
  const [issued, setIssued] = useState<TokenIssued>()

  const tokens = useTokenList(root)
  const revoke = useRevokeToken()
  const create = useCreateToken()

  const rows = tokens.data?.tokens ?? []

  const mint = useMutation({
    mutationFn: () =>
      create.mutateAsync({
        body: {
          name,
          scopes: scopes
            .split(',')
            .map((scope) => scope.trim())
            .filter((scope) => scope !== ''),
        },
        credential: root,
      }),
    onSuccess: (token) => {
      setIssued(token)
      setName('')
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader items={crumbs} title="API tokens" />

      <Panel className="divide-border divide-y">
        <section className="space-y-3 p-5 sm:p-6">
          <Text as="p" tone="section">
            Issued
          </Text>
          {rows.length === 0 ? (
            <Text as="p" tone="muted">
              {tokens.isPending
                ? 'Loading…'
                : tokens.error === null
                  ? 'No token yet. Mint one below and hand it to a script instead of the password.'
                  : tokens.error.message}
            </Text>
          ) : (
            <TokenList
              tokens={rows}
              revoking={revoke.isPending}
              onRevoke={(ref) => {
                revoke.mutate(ref)
              }}
            />
          )}
        </section>

        <section className="space-y-4 p-5 sm:p-6">
          <Text as="p" tone="section">
            Mint one
          </Text>

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
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                }}
              />
            </Field>
            <Field label="Scopes" hint="Comma separated; admin covers all.">
              <TextInput
                name="token-scopes"
                value={scopes}
                onChange={(event) => {
                  setScopes(event.target.value)
                }}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field
                label="Password"
                hint="The token list is root-only: the instance password reads it and mints from it, and is never stored."
              >
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
                disabled={name === '' || root === ''}
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
      </Panel>
    </div>
  )
}
