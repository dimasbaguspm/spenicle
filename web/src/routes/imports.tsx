import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { buttonStyles } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DebounceForm, TextField } from '@/components/ui/form'
import { useImports } from '@/hooks/queries/use-imports'
import { cn } from '@/lib/cn'
import { ImportList } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const importCrumbs = [{ label: 'Manage', to: '/manage' }, { label: 'Imports' }] as const

/**
 * Every statement this instance has seen. Uploading has its own page; this one searches what is
 * already here and opens a draft for review.
 */
export function ImportsPage() {
  const [query, setQuery] = useState('')
  const batches = useImports({ limit: 100 })

  const needle = query.trim().toLowerCase()
  const rows = (batches.data?.imports ?? []).filter(
    (batch) =>
      needle === '' ||
      batch.ref.includes(needle) ||
      (batch.filename ?? '').toLowerCase().includes(needle),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        items={importCrumbs}
        title="Statements you brought in"
        subtitle="Each one is a draft you approve row by row."
        action={
          <Link
            to="/manage/imports/new"
            className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
          >
            <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
            New import
          </Link>
        }
      />

      <DebounceForm<{ q: string }>
        className="max-w-sm"
        defaultValues={{ q: '' }}
        onDebounce={(values) => {
          setQuery(values.q)
        }}
      >
        {() => <TextField<{ q: string }> name="q" label="Search" placeholder="file name or ref" />}
      </DebounceForm>

      {batches.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {batches.error.message}
        </Text>
      )}

      {rows.length === 0 ? (
        <Panel>
          <div className="space-y-3 p-5 sm:p-6">
            <Text as="p" tone="muted">
              {batches.isPending
                ? 'Loading'
                : needle === ''
                  ? 'No statements yet. A CSV needs the columns occurred_on, amount_minor and description.'
                  : 'No statement matches that name or ref.'}
            </Text>
            {batches.isPending ? null : (
              <Link
                to="/manage/imports/new"
                className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
              >
                <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
                New import
              </Link>
            )}
          </div>
        </Panel>
      ) : (
        <Panel>
          <ImportList batches={rows} />
        </Panel>
      )}
    </div>
  )
}
