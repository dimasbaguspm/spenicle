import { useNavigate } from '@tanstack/react-router'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { Form } from '@/components/ui/form'
import { useMeta } from '@/hooks/queries/use-meta'
import { useCreatePayee } from '@/hooks/queries/use-payees'
import {
  emptyPayeeForm,
  PayeeFields,
  payeeBody,
  payeeResolver,
  type PayeeFormValues,
} from '@/modules'

export function NewPayeePage() {
  const navigate = useNavigate()
  const meta = useMeta()
  const create = useCreatePayee()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        items={[{ label: 'Payees', to: '/payees' }, { label: 'New payee' }]}
        title="New payee"
      />

      <Panel>
        <div className="p-5 sm:p-6">
          <PanelHead
            eyebrow="Payee"
            description="The defaults are optional, and they are the whole point: the name remembers what you would otherwise pick twice."
          />
          <Form<PayeeFormValues>
            className="mt-4"
            defaultValues={emptyPayeeForm}
            resolver={payeeResolver}
            submitLabel="Create payee"
            onCancel={() => void navigate({ to: '/payees' })}
            onSubmit={(values) => {
              create.mutate(payeeBody(values), {
                onSuccess: (created) => {
                  void navigate({ to: '/payees/$ref', params: { ref: created.ref } })
                },
              })
            }}
          >
            {() => <PayeeFields accounts={meta.data?.accounts ?? []} emptyLabel="No default" />}
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
