import { useNavigate, useParams } from '@tanstack/react-router'
import { useMemo } from 'react'

import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { Form } from '@/components/ui/form'
import { useMeta } from '@/hooks/queries/use-meta'
import { usePatchPayee, usePayees } from '@/hooks/queries/use-payees'
import { PayeeFields, payeeBody, payeeResolver, type PayeeFormValues } from '@/modules'

export function PayeeEditPage() {
  const { ref } = useParams({ from: '/payees/$ref/edit' })
  const navigate = useNavigate()
  const meta = useMeta()
  const held = usePayees({ refs: ref, limit: 1 })
  const patch = usePatchPayee()

  const payee = held.data?.payees[0]
  const values = useMemo(
    () =>
      payee === undefined
        ? undefined
        : {
            name: payee.name,
            accountRef: payee.default_account_ref ?? '',
            categoryRef: payee.default_category_ref ?? '',
          },
    [payee],
  )

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Breadcrumb
        items={[
          { label: 'Payees', to: '/payees' },
          { label: payee?.name ?? 'Payee', to: `/payees/${ref}` },
          { label: 'Edit' },
        ]}
      />
      <Text as="h1" tone="display">
        Edit payee
      </Text>

      {values === undefined ? null : (
        <Panel>
          <div className="p-5 sm:p-6">
            <PanelHead
              eyebrow="Payee"
              description="Sending a default leaves the other one alone; the API has no way to clear one once set."
            />
            <Form<PayeeFormValues>
              className="mt-4"
              defaultValues={values}
              resolver={payeeResolver}
              submitLabel="Save payee"
              onCancel={() => void navigate({ to: '/payees/$ref', params: { ref } })}
              onSubmit={(next) => {
                patch.mutate(
                  { ref, body: payeeBody(next) },
                  {
                    onSuccess: () => {
                      void navigate({ to: '/payees/$ref', params: { ref } })
                    },
                  },
                )
              }}
            >
              {() => (
                <PayeeFields accounts={meta.data?.accounts ?? []} emptyLabel="Leave unchanged" />
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
