import { Link } from '@tanstack/react-router'
import { FlaskConical, Plus } from 'lucide-react'
import { useState } from 'react'

import type { Account } from '@/api/types'
import { buttonStyles } from '@/components/primitives/button'
import { Dialog } from '@/components/primitives/dialog'
import { Field } from '@/components/primitives/field'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useMeta } from '@/hooks/queries/use-meta'
import { useRules, useSuggestion } from '@/hooks/queries/use-rules'
import { cn } from '@/lib/cn'
import { RuleList, ruleRow } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const ruleCrumbs = [{ label: 'Manage', to: '/manage' }, { label: 'Rules' }] as const

/**
 * What the ledger pre-fills, and why. The list is a list: creating, correcting and archiving a rule
 * each have a page, and the playground — the same question the entry form asks — opens over it.
 */
export function RulesPage() {
  const rules = useRules({ limit: 200, include_archived: 'true' })
  const meta = useMeta()

  const accounts = meta.data?.accounts ?? []
  const rows = (rules.data?.rules ?? []).map((rule) => ruleRow(rule, accounts))

  return (
    <div className="space-y-6">
      <PageHeader
        items={ruleCrumbs}
        title="Rules"
        action={
          <div className="flex items-center gap-2">
            <Playground accounts={accounts} />
            <Link
              to="/manage/rules/new"
              className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
            >
              <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
              New rule
            </Link>
          </div>
        }
      />

      {rules.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {rules.error.message}
        </Text>
      )}

      {rows.length === 0 ? (
        <Panel>
          <div className="space-y-3 p-5 sm:p-6">
            <Text as="p" tone="muted">
              {rules.isPending
                ? 'Loading'
                : 'No rules yet. One pattern and one category is enough to stop filing the same shop twice.'}
            </Text>
            {rules.isPending ? null : (
              <Link
                to="/manage/rules/new"
                className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
              >
                <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
                New rule
              </Link>
            )}
          </div>
        </Panel>
      ) : (
        <Panel>
          <RuleList rows={rows} />
        </Panel>
      )}
    </div>
  )
}

/** The suggest endpoint, out loud: a line in, the category and the reason it got, nothing written. */
function Playground({ accounts }: { accounts: readonly Account[] }) {
  return (
    <Dialog
      title="Playground"
      description="Type a payee name or a raw statement line. Nothing is written: this is the same question the entry form asks."
      trigger={
        <button type="button" className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}>
          <FlaskConical className="size-3.5" aria-hidden="true" strokeWidth={2} />
          Playground
        </button>
      }
    >
      <PlaygroundBody accounts={accounts} />
    </Dialog>
  )
}

function PlaygroundBody({ accounts }: { accounts: readonly Account[] }) {
  const [text, setText] = useState('')
  const answer = useSuggestion(text.trim() === '' ? {} : { text: text.trim() })

  return (
    <div className="space-y-3">
      <Field label="Line">
        <TextInput
          name="suggest-text"
          placeholder="INDOMARET 09 SAM RATULANGI"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
          }}
        />
      </Field>

      {answer.data === undefined ? (
        <Text as="p" tone="muted">
          {answer.error === null
            ? 'Type a line to see what this instance would pre-fill.'
            : answer.error.message}
        </Text>
      ) : (
        <div className="border-border space-y-1 rounded-md border p-4">
          <Text as="p" tone="body">
            {accounts.find((account) => account.ref === answer.data.account_ref)?.name ??
              answer.data.account_name}
          </Text>
          <Text as="p" tone="caption">
            {answer.data.why}
          </Text>
          <Text as="p" tone="caption" className="text-text-faint">
            {answer.data.tier === 'none' ? 'nothing matched' : answer.data.tier}
            {answer.data.rule_ref === undefined ? '' : `, rule ${answer.data.rule_ref.slice(0, 8)}`}
          </Text>
        </div>
      )}
    </div>
  )
}
