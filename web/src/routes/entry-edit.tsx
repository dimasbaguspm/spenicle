import { useNavigate, useParams } from '@tanstack/react-router'
import { useMemo } from 'react'

import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DateField, Form, TextField } from '@/components/ui/form'
import { useEntry, usePatchEntry } from '@/hooks/queries/use-entries'

type EntryEditValues = {
  note: string
  occurredOn: string
}

/**
 * The two fields a client may change on an entry. An amount or a posting is a reversal, not an
 * edit, so this page does not pretend otherwise: the API refuses what it refuses.
 */
export function EntryEditPage() {
  const { ref } = useParams({ from: '/ledger/$ref/edit' })
  const navigate = useNavigate()
  const entry = useEntry(ref)
  const patch = usePatchEntry()

  const values = useMemo(
    () =>
      entry.data === undefined
        ? undefined
        : { note: entry.data.note ?? '', occurredOn: entry.data.occurred_on },
    [entry.data],
  )

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Ledger', to: '/ledger' },
          { label: 'Entry', to: `/ledger/${ref}` },
          { label: 'Edit' },
        ]}
      />
      <Text as="h1" tone="display">
        Edit entry
      </Text>

      {entry.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {entry.error.message}
        </Text>
      )}

      {values === undefined ? null : (
        <Panel>
          <div className="p-5 sm:p-6">
            <PanelHead
              eyebrow="Entry"
              description="The note and the day. Everything else is reversed and reposted."
            />
            <Form<EntryEditValues>
              className="mt-4"
              defaultValues={values}
              submitLabel="Save entry"
              onCancel={() => void navigate({ to: '/ledger/$ref', params: { ref } })}
              onSubmit={(next) => {
                patch.mutate(
                  { ref, body: { note: next.note, occurred_on: next.occurredOn } },
                  {
                    onSuccess: () => {
                      void navigate({ to: '/ledger/$ref', params: { ref } })
                    },
                  },
                )
              }}
            >
              {() => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField<EntryEditValues> name="note" label="Note" />
                  <DateField<EntryEditValues> name="occurredOn" label="Day" />
                </div>
              )}
            </Form>
            {patch.error === null ? null : (
              <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
                {patch.error.message}
              </Text>
            )}
          </div>
        </Panel>
      )}
    </div>
  )
}
