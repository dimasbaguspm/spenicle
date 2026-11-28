import { useState } from 'react'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { useActivity } from '@/hooks/queries/use-audit'
import { useMeta } from '@/hooks/queries/use-meta'
import { ActivityList, activityRow } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const crumbs = [{ label: 'Settings', to: '/settings' }, { label: 'Activity' }] as const

const kinds = [
  { label: 'Everything', value: '' },
  { label: 'Entries', value: 'ledger_entry' },
  { label: 'Accounts', value: 'account' },
  { label: 'Payees', value: 'payee' },
  { label: 'Rules', value: 'categorization_rule' },
  { label: 'Recurring', value: 'recurring_rule' },
  { label: 'Tokens', value: 'api_token' },
  { label: 'Settings', value: 'setting' },
]

const actions = [
  { label: 'Any action', value: '' },
  { label: 'Logged', value: 'create' },
  { label: 'Edited', value: 'update' },
  { label: 'Reversed', value: 'reverse' },
  { label: 'Approved', value: 'approve' },
  { label: 'Rejected', value: 'reject' },
  { label: 'Revoked', value: 'revoke' },
]

/**
 * One journal for the whole instance: the entity pages keep their own timeline, and this is where
 * you find a change when you do not already know which row it belongs to. Each line links straight
 * to the entity, so a reading turns into a fix in one click.
 */
export function ActivityPage() {
  const [kind, setKind] = useState('')
  const [action, setAction] = useState('')
  const meta = useMeta()
  const activity = useActivity({
    limit: 200,
    ...(kind === '' ? {} : { entity_kind: kind }),
    ...(action === '' ? {} : { action }),
  })

  const accounts = meta.data?.accounts ?? []
  const rows = (activity.data?.audit ?? []).map((row) => activityRow(row, accounts))

  return (
    <div className="space-y-6">
      <PageHeader
        items={crumbs}
        title="Every change, in order"
        subtitle="One journal for the instance, each line a link to the row it changed."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <SelectInput
          value={kind}
          options={kinds}
          placeholder="Everything"
          onChange={(next) => {
            setKind(next)
          }}
        />
        <SelectInput
          value={action}
          options={actions}
          placeholder="Any action"
          onChange={(next) => {
            setAction(next)
          }}
        />
      </div>

      {activity.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {activity.error.message}
        </Text>
      )}

      {rows.length === 0 ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              {activity.isPending ? 'Loading' : 'Nothing has been written yet.'}
            </Text>
          </div>
        </Panel>
      ) : (
        <Panel>
          <ActivityList rows={rows} />
        </Panel>
      )}
    </div>
  )
}
