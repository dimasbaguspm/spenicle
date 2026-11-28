import { useState } from 'react'

import type { ConnectionStart } from '@/api/types'
import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { PasswordInput } from '@/components/primitives/password-input'
import { SwitchInput } from '@/components/primitives/switch-input'
import { TagsInput } from '@/components/primitives/tags-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import {
  useConnection,
  useIntakeConfig,
  useMessages,
  usePatchIntakeConfig,
  useRefreshMessage,
  useRevokeConnection,
  useRunIntake,
  useStartConnection,
} from '@/hooks/queries/use-intake'
import { DateFormat, formatDate } from '@/lib/date'
import { MessageList } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const crumbs = [{ label: 'Settings', to: '/settings' }, { label: 'Mailbox' }] as const

/**
 * The mailbox, in one place: the Google grant, whether intake polls it, which senders may become
 * captures, and the mails it has already seen. Every route behind this page is root-only, so the
 * instance password is the key and it is never stored.
 */
export function MailboxPage() {
  const [root, setRoot] = useState('')

  return (
    <div className="space-y-6">
      <PageHeader
        items={crumbs}
        title="What the mail turns into"
        subtitle="The Google grant, what intake polls, and the mail it has seen."
      />

      <Panel>
        <section className="space-y-4 p-5 sm:p-6">
          <Text as="p" tone="section">
            Password
          </Text>
          <Field label="Instance password">
            <PasswordInput
              name="root-password"
              autoComplete="current-password"
              value={root}
              onChange={(event) => {
                setRoot(event.target.value)
              }}
            />
          </Field>
        </section>
      </Panel>

      {root === '' ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              Enter the instance password to read the connection and the intake settings.
            </Text>
          </div>
        </Panel>
      ) : (
        <Mailbox root={root} />
      )}
    </div>
  )
}

function Mailbox({ root }: { root: string }) {
  const connection = useConnection(root)
  const config = useIntakeConfig(root)
  const messages = useMessages(root, { limit: 50 })
  const start = useStartConnection()
  const revoke = useRevokeConnection()
  const patch = usePatchIntakeConfig()
  const run = useRunIntake()
  const refresh = useRefreshMessage()

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [authorize, setAuthorize] = useState<ConnectionStart>()
  const [enabled, setEnabled] = useState(config.data?.enabled ?? false)
  const [allowlist, setAllowlist] = useState<string[]>(config.data?.allowlist ?? [])

  const status = connection.data?.status ?? ''
  const connected = status === 'active'
  const rows = messages.data?.messages ?? []
  const redirectUrl = `${window.location.origin}/api/connections/google/callback`

  return (
    <>
      <Panel>
        <section className="space-y-4 p-5 sm:p-6">
          <Text as="p" tone="section">
            Google mailbox
          </Text>

          {connection.data === undefined ? (
            <Text as="p" tone="muted">
              {connection.isPending ? 'Reading the connection' : (connection.error?.message ?? '')}
            </Text>
          ) : (
            <Text as="p" tone="muted">
              {connected
                ? `Connected as ${connection.data.account ?? 'an unnamed account'}, granted ${(
                    connection.data.scopes ?? []
                  ).join(', ')}.`
                : status === 'reauth_required'
                  ? 'The grant expired: authorise Google again.'
                  : 'No mailbox is connected. Polling stays off until one is.'}
              {[
                connection.data.revoked_at === undefined
                  ? ''
                  : ` Revoked ${formatDate(connection.data.revoked_at, DateFormat.Timestamp)}.`,
                connection.data.access_expires_at === undefined
                  ? ''
                  : ` Access until ${formatDate(connection.data.access_expires_at, DateFormat.Timestamp)}.`,
                connection.data.last_refreshed_at === undefined
                  ? ''
                  : ` Refreshed ${formatDate(connection.data.last_refreshed_at, DateFormat.Timestamp)}.`,
              ].join('')}
            </Text>
          )}

          {connection.data?.ref === undefined || !connected ? (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault()
                start.mutate(
                  {
                    body: {
                      client_id: clientId,
                      client_secret: clientSecret,
                      redirect_url: redirectUrl,
                    },
                    credential: root,
                  },
                  {
                    onSuccess: (answer) => {
                      setAuthorize(answer)
                    },
                  },
                )
              }}
            >
              <Field label="Client id">
                <TextInput
                  name="google-client-id"
                  value={clientId}
                  onChange={(event) => {
                    setClientId(event.target.value)
                  }}
                />
              </Field>
              <Field label="Client secret">
                <PasswordInput
                  name="google-client-secret"
                  autoComplete="off"
                  value={clientSecret}
                  onChange={(event) => {
                    setClientSecret(event.target.value)
                  }}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Redirect URL">
                  <TextInput name="google-redirect" value={redirectUrl} readOnly />
                </Field>
              </div>
              <div>
                <Button
                  type="submit"
                  tone="quiet"
                  loading={start.isPending}
                  disabled={clientId === '' || clientSecret === ''}
                >
                  Start authorisation
                </Button>
              </div>
            </form>
          ) : (
            <Button
              tone="quiet"
              loading={revoke.isPending}
              onClick={() => {
                if (connection.data?.ref !== undefined) {
                  revoke.mutate({ ref: connection.data.ref, credential: root })
                }
              }}
            >
              Revoke the grant
            </Button>
          )}

          {authorize === undefined ? null : (
            <div className="border-border space-y-1 rounded-md border p-4">
              <Text as="p" tone="section">
                Grant it in Google
              </Text>
              <Text as="p" tone="code" className="break-all">
                {authorize.authorize_url}
              </Text>
              <Text as="p" tone="caption">
                The callback writes the grant; come back here to see it connected.
              </Text>
            </div>
          )}

          {start.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger" role="alert">
              {start.error.message}
            </Text>
          )}
          {revoke.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger" role="alert">
              {revoke.error.message}
            </Text>
          )}
        </section>
      </Panel>

      <Panel>
        <section className="space-y-4 p-5 sm:p-6">
          <Text as="p" tone="section">
            Polling
          </Text>

          <SwitchInput
            checked={enabled}
            label="Poll the mailbox"
            onCheckedChange={(next) => {
              setEnabled(next)
            }}
          />

          <Field label="Allowed senders">
            <TagsInput
              value={allowlist}
              placeholder="bank.example"
              onValueChange={(next) => {
                setAllowlist(next)
              }}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              tone="quiet"
              loading={patch.isPending}
              onClick={() => {
                patch.mutate({ body: { enabled, allowlist }, credential: root })
              }}
            >
              Save
            </Button>
            <Button
              loading={run.isPending}
              disabled={!connected}
              onClick={() => {
                run.mutate(root)
              }}
            >
              Poll now
            </Button>
            {run.data === undefined ? null : (
              <Text as="span" tone="caption" className="text-text-muted">
                {run.data.created} created, {run.data.skipped} skipped, {run.data.unchanged}{' '}
                unchanged, {run.data.failed} failed
              </Text>
            )}
          </div>

          {patch.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger" role="alert">
              {patch.error.message}
            </Text>
          )}
          {run.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger" role="alert">
              {run.error.message}
            </Text>
          )}
        </section>
      </Panel>

      <Panel>
        <section className="space-y-3 p-5 sm:p-6">
          <Text as="p" tone="section">
            Seen
          </Text>
          {rows.length === 0 ? (
            <Text as="p" tone="muted">
              {messages.isPending
                ? 'Loading'
                : (messages.error?.message ??
                  'No mail yet. Poll the mailbox once the grant is in.')}
            </Text>
          ) : (
            <MessageList
              messages={rows}
              onRefresh={(ref) => {
                refresh.mutate({ ref, credential: root })
              }}
            />
          )}
          {refresh.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger" role="alert">
              {refresh.error.message}
            </Text>
          )}
        </section>
      </Panel>
    </>
  )
}
