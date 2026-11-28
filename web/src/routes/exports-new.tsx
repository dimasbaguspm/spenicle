import { Schema } from 'effect'
import { useNavigate } from '@tanstack/react-router'
import type { Resolver } from 'react-hook-form'

import type { ExportCreate } from '@/api/exports'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DateField, Form, SelectField } from '@/components/ui/form'
import { useCreateExport } from '@/hooks/queries/use-exports'

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
const crumbs = [
  { label: 'Manage', to: '/manage' },
  { label: 'Exports', to: '/manage/exports' },
  { label: 'New export' },
] as const

/** A window the form left empty is simply not sent: the job then covers the whole ledger. */
function exportBody(values: ExportFormValues): ExportCreate {
  return {
    format: values.format === 'csv' ? 'csv' : 'json',
    ...(values.from === '' ? {} : { from: values.from }),
    ...(values.to === '' ? {} : { to: values.to }),
  }
}

/** Queueing a job, on its own page: the form is a decision, the list is the queue. */
export function NewExportPage() {
  const navigate = useNavigate()
  const create = useCreateExport()

  return (
    <div className="space-y-6">
      <PageHeader items={crumbs} title="New export" />

      <Panel>
        <div className="p-5 sm:p-6">
          <PanelHead
            eyebrow="Job"
            description="The worker renders it and keeps the file for a month. Nothing is written to the ledger."
          />
          <Form<ExportFormValues>
            className="mt-4"
            defaultValues={{ format: 'json', from: '', to: '' }}
            resolver={resolver}
            submitLabel="Queue export"
            onCancel={() => void navigate({ to: '/manage/exports' })}
            onSubmit={(values) => {
              create.mutate(exportBody(values), {
                onSuccess: async (job) => {
                  await navigate({ to: '/manage/exports/$ref', params: { ref: job.ref } })
                },
              })
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
                  <DateField<ExportFormValues> name="from" label="From" />
                  <DateField<ExportFormValues> name="to" label="To" />
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
    </div>
  )
}
