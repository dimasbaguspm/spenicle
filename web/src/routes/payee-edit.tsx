import { useNavigate, useParams } from '@tanstack/react-router'
import { useMemo } from 'react'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { Form } from '@/components/ui/form'
import { useMeta } from '@/hooks/queries/use-meta'
import { usePatchPayee, usePayees } from '@/hooks/queries/use-payees'
import { PayeeFields, payeeBody, payeeResolver, type PayeeFormValues } from '@/modules'

export function PayeeEditPage() {
  const { ref } = useParams({ from: '/manage/payees/$ref/edit' })
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
    <div className="space-y-6">
      <PageHeader
        items={[
          { label: 'Manage', to: '/manage' },
          { label: 'Payees', to: '/manage/payees' },
          { label: payee?.name ?? 'Payee', to: `/manage/payees/${ref}` },
          { label: 'Edit' },
        ]}
        title="Change this payee"
        subtitle="Its name, and where an entry should default to."
      />

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
              onCancel={() => void navigate({ to: '/manage/payees/$ref', params: { ref } })}
              onSubmit={(next) => {
                patch.mutate(
                  { ref, body: payeeBody(next) },
                  {
                    onSuccess: () => {
                      void navigate({ to: '/manage/payees/$ref', params: { ref } })
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
