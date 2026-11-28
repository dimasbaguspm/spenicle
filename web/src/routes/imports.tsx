import { useNavigate } from '@tanstack/react-router'
import { Upload } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/primitives/button'
import { control } from '@/components/primitives/control'
import { Field } from '@/components/primitives/field'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { useCreateImport, useImports } from '@/hooks/queries/use-imports'
import { useMeta } from '@/hooks/queries/use-meta'
import { cn } from '@/lib/cn'
import { ImportList, isMoneyKind } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const importCrumbs = [{ label: 'Manage', to: '/manage' }, { label: 'Imports' }] as const

/**
 * Statements in, one draft at a time. The upload writes a draft and nothing else: the review page
 * is where rows are accepted and the commit is what posts. A terminal batch stays listed forever,
 * because it keeps its rows, its file and its events.
 */
export function ImportsPage() {
  const batches = useImports({ limit: 50 })

  const rows = batches.data?.imports ?? []

  return (
    <div className="space-y-6">
      <PageHeader items={importCrumbs} title="Imports" />

      <UploadPanel />

      {batches.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {batches.error.message}
        </Text>
      )}

      {rows.length === 0 ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              {batches.isPending
                ? 'Loading…'
                : 'No statements yet. A CSV needs the columns occurred_on, amount_minor and description.'}
            </Text>
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

/**
 * The file is the point, so the panel is one field and one button. The idempotency key is minted
 * when the file is chosen: a retry of the same upload then resumes the same draft instead of
 * writing a second one.
 */
function UploadPanel() {
  const navigate = useNavigate()
  const meta = useMeta()
  const create = useCreateImport()

  const [file, setFile] = useState<File>()
  const [key, setKey] = useState('')
  const [accountRef, setAccountRef] = useState('')

  const accounts = (meta.data?.accounts ?? []).filter((account) => isMoneyKind(account.kind))
  const options = [
    { label: 'Unsorted (the default)', value: '' },
    ...accounts.map((account) => ({ label: account.name, value: account.ref })),
  ]

  return (
    <Panel>
      <div className="p-5 sm:p-6">
        <PanelHead
          eyebrow="New import"
          description="A CSV line per row. Nothing posts here: the commit on the review page does."
        />

        <form
          className="mt-4 space-y-5"
          onSubmit={(event) => {
            event.preventDefault()

            if (file === undefined) {
              return
            }

            create.mutate(
              {
                file,
                idempotencyKey: key,
                ...(accountRef === '' ? {} : { accountRef }),
              },
              {
                onSuccess: async (batch) => {
                  await navigate({ to: '/manage/imports/$ref', params: { ref: batch.ref } })
                },
              },
            )
          }}
        >
          <Field
            label="Statement"
            hint="Columns: occurred_on, amount_minor, description, and optionally currency."
          >
            <input
              type="file"
              accept="text/csv,.csv"
              className={cn(control(), 'file:text-text-muted py-2 file:mr-3 file:border-0')}
              onChange={(event) => {
                const chosen = event.target.files?.[0]

                setFile(chosen)
                setKey(chosen === undefined ? '' : `statement-${Date.now().toString(36)}`)
              }}
            />
          </Field>

          <Field label="Paid from" hint="Every row of this statement moves through one account.">
            <SelectInput
              value={accountRef}
              options={options}
              placeholder="Unsorted"
              onChange={(next) => {
                setAccountRef(next)
              }}
            />
          </Field>

          <div className="flex justify-end">
            <Button
              type="submit"
              leadingIcon={Upload}
              loading={create.isPending}
              disabled={file === undefined}
            >
              {create.isPending ? 'Uploading…' : 'Upload statement'}
            </Button>
          </div>
        </form>

        {create.error === null ? null : (
          <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
            {create.error.message}
          </Text>
        )}
      </div>
    </Panel>
  )
}
