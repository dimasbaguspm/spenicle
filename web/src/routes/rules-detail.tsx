import { Link, useParams } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'

import { Button, buttonStyles } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useMeta } from '@/hooks/queries/use-meta'
import { usePatchRule, useRules } from '@/hooks/queries/use-rules'
import { cn } from '@/lib/cn'
import { DateFormat, formatDate } from '@/lib/date'
import { absent } from '@/lib/text'

/**
 * One rule, whole: the pattern it matches, where it looks, the category it answers with, and the
 * two things a person does to it — archive it while the merchant is gone, or edit what it says.
 */
export function RuleDetailPage() {
  const { ref } = useParams({ from: '/manage/rules/$ref' })
  const meta = useMeta()
  const patch = usePatchRule()
  const held = useRules({ limit: 200, include_archived: 'true' })

  const rule = held.data?.rules.find((row) => row.ref === ref)
  const category = (meta.data?.accounts ?? []).find((account) => account.ref === rule?.category_ref)

  return (
    <div className="space-y-6">
      <PageHeader
        items={[
          { label: 'Manage', to: '/manage' },
          { label: 'Rules', to: '/manage/rules' },
          { label: rule?.pattern ?? 'rule' },
        ]}
        title={rule?.pattern ?? 'Rule'}
        action={
          <Link
            to="/manage/rules/$ref/edit"
            params={{ ref }}
            className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
          >
            <Pencil className="size-3.5" aria-hidden="true" strokeWidth={2} />
            Edit
          </Link>
        }
      />

      {held.isPending ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              Loading…
            </Text>
          </div>
        </Panel>
      ) : rule === undefined ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              No rule with that reference.
            </Text>
          </div>
        </Panel>
      ) : (
        <Panel>
          <div className="space-y-3 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <Text as="p" tone="section" className="font-mono">
                {rule.pattern}
              </Text>
              <Text as="p" tone="caption" className="text-text-faint">
                {rule.archived ? 'archived' : 'live'}
              </Text>
            </div>

            <dl className="border-border grid gap-y-2 border-t pt-3 text-sm">
              <Fact label="Looks in" value={rule.field} />
              <Fact label="Matches" value={rule.match_kind} />
              <Fact label="Category" value={category?.name ?? absent} />
              <Fact label="Priority" value={String(rule.priority)} />
              <Fact label="Created" value={formatDate(rule.created_at, DateFormat.Timestamp)} />
              <Fact label="Ref" value={rule.ref} mono />
            </dl>

            <div className="flex justify-end">
              <Button
                tone="quiet"
                size="sm"
                loading={patch.isPending}
                onClick={() => {
                  patch.mutate({ ref, body: { archived: !rule.archived } })
                }}
              >
                {rule.archived ? 'Restore' : 'Archive'}
              </Button>
            </div>

            {patch.error === null ? null : (
              <Text as="p" tone="caption" className="text-danger" role="alert">
                {patch.error.message}
              </Text>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-text-faint text-xs">{label}</dt>
      <dd className={cn('text-text truncate text-xs', mono === true && 'font-mono')}>{value}</dd>
    </div>
  )
}
