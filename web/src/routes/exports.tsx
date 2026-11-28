import { Schema } from 'effect'
import { RefreshCw } from 'lucide-react'
import type { Resolver } from 'react-hook-form'

import { downloadExport, type ExportCreate } from '@/api/exports'
import { queryClient } from '@/api/query'
import { Button } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DateField, Form, SelectField } from '@/components/ui/form'
import { useCreateExport, useExports } from '@/hooks/queries/use-exports'
import { saveBlob } from '@/lib/download'
import { ExportList } from '@/modules'

const ExportForm = Schema.Struct({
  format: Schema.NonEmptyString,
  from: Schema.String,
  to: Schema.String,
})

type ExportFormValues = typeof ExportForm.Type

const resolver: Resolver<ExportFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(ExportForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

const formatOptions = [
  { label: 'JSON', value: 'json' },
  { label: 'CSV', value: 'csv' },
]

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const exportCrumbs = [{ label: 'Manage', to: '/manage' }, { label: 'Exports' }] as const

/** A window the form left empty is simply not sent: the job then covers the whole ledger. */
function exportBody(values: ExportFormValues): ExportCreate {
  return {
    format: values.format === 'csv' ? 'csv' : 'json',
    ...(values.from === '' ? {} : { from: values.from }),
    ...(values.to === '' ? {} : { to: values.to }),
  }
}

/** The way out of this instance: a job the worker renders, and a file kept for a month. */
export function ExportsPage() {
  const exports = useExports({ limit: 50 })
  const create = useCreateExport()

  const jobs = exports.data?.exports ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        items={exportCrumbs}
        title="Exports"
        action={
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
        }
      />

      <Panel>
        <div className="p-5 sm:p-6">
          <PanelHead
            eyebrow="New export"
            description="A job, not a request: the worker renders the ledger and keeps the file for a month."
          />
          <Form<ExportFormValues>
            className="mt-4"
            defaultValues={{ format: 'json', from: '', to: '' }}
            resolver={resolver}
            submitLabel="Queue export"
            onSubmit={(next) => {
              create.mutate(exportBody(next))
            }}
          >
            {() => (
              <>
                <SelectField<ExportFormValues>
                  name="format"
                  label="Format"
                  options={formatOptions}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <DateField<ExportFormValues>
                    name="from"
                    label="From"
                    hint="Optional. The first day the document covers."
                  />
                  <DateField<ExportFormValues>
                    name="to"
                    label="To"
                    hint="Optional. Leave both empty for the whole ledger."
                  />
                </div>
              </>
            )}
          </Form>
          {create.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
              {create.error.message}
            </Text>
          )}
        </div>
      </Panel>

      {exports.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {exports.error.message}
        </Text>
      )}

      {jobs.length === 0 ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              {exports.isPending
                ? 'Loading…'
                : 'No exports yet. A job renders the ledger and keeps the file for a month.'}
            </Text>
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
