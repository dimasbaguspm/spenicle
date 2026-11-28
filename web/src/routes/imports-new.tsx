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
import { useCreateImport } from '@/hooks/queries/use-imports'
import { useMeta } from '@/hooks/queries/use-meta'
import { cn } from '@/lib/cn'
import { isMoneyKind } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const crumbs = [
  { label: 'Manage', to: '/manage' },
  { label: 'Imports', to: '/manage/imports' },
  { label: 'New import' },
] as const

/**
 * One file, one account, one key. The key is minted when the file is chosen, so retrying the same
 * upload resumes the same draft instead of writing a second one.
 */
export function NewImportPage() {
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
    <div className="space-y-6">
      <PageHeader items={crumbs} title="New import" />

      <Panel>
        <div className="p-5 sm:p-6">
          <PanelHead
            eyebrow="Statement"
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
                { file, idempotencyKey: key, ...(accountRef === '' ? {} : { accountRef }) },
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
    </div>
  )
}
