import { Link } from '@tanstack/react-router'
import { Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { downloadExport } from '@/api/exports'
import { queryClient } from '@/api/query'
import { Button, buttonStyles } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DebounceForm, TextField } from '@/components/ui/form'
import { useExports } from '@/hooks/queries/use-exports'
import { cn } from '@/lib/cn'
import { saveBlob } from '@/lib/download'
import { ExportList } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const exportCrumbs = [{ label: 'Manage', to: '/manage' }, { label: 'Exports' }] as const

/** What the worker has rendered, newest first, with the file saved from a blob. */
export function ExportsPage() {
  const [query, setQuery] = useState('')
  const exports = useExports({ limit: 100 })

  const needle = query.trim().toLowerCase()
  const jobs = (exports.data?.exports ?? []).filter(
    (job) =>
      needle === '' ||
      job.ref.includes(needle) ||
      (job.format ?? '').toLowerCase().includes(needle) ||
      (job.status ?? '').toLowerCase().includes(needle),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        items={exportCrumbs}
        title="Exports"
        action={
          <div className="flex items-center gap-2">
            <Button
              tone="quiet"
              size="sm"
              leadingIcon={RefreshCw}
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ['exports'] })
              }}
            >
              Refresh
            </Button>
            <Link
              to="/manage/exports/new"
              className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
            >
              <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
              New export
            </Link>
          </div>
        }
      />

      <DebounceForm<{ q: string }>
        className="max-w-sm"
        defaultValues={{ q: '' }}
        onDebounce={(values) => {
          setQuery(values.q)
        }}
      >
        {() => (
          <TextField<{ q: string }> name="q" label="Search" placeholder="format, status or ref…" />
        )}
      </DebounceForm>

      {exports.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {exports.error.message}
        </Text>
      )}

      {jobs.length === 0 ? (
        <Panel>
          <div className="space-y-3 p-5 sm:p-6">
            <Text as="p" tone="muted">
              {exports.isPending
                ? 'Loading…'
                : needle === ''
                  ? 'No exports yet. A job renders the ledger and keeps the file for a month.'
                  : 'No job matches that search.'}
            </Text>
            {exports.isPending ? null : (
              <Link
                to="/manage/exports/new"
                className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
              >
                <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
                New export
              </Link>
            )}
          </div>
        </Panel>
      ) : (
        <Panel>
          <ExportList jobs={jobs} onDownload={(job) => void saveJob(job)} />
        </Panel>
      )}
    </div>
  )
}

/** The bytes come back as a blob because the route expects the header the SPA holds. */
async function saveJob(job: { ref: string; format?: string | undefined }): Promise<void> {
  const blob = await downloadExport(job.ref)

  saveBlob(blob, `spenicle-${job.ref}.${job.format ?? 'json'}`)
}
