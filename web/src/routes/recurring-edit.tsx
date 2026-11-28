import { useNavigate, useParams } from '@tanstack/react-router'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { Form } from '@/components/ui/form'
import { useMeta } from '@/hooks/queries/use-meta'
import { usePatchRecurring, useRecurring } from '@/hooks/queries/use-recurring'
import { useMoney } from '@/hooks/use-money'
import {
  RecurringFields,
  recurringPatch,
  recurringResolver,
  recurringValues,
  type RecurringFormValues,
} from '@/modules'

/**
 * The schedule, corrected. Payee, account and category are the identity of a rule and the API will
 * not move them, so the fields are still shown — a person editing a schedule wants to see whose it
 * is — and the form says which three cannot change here.
 */
export function EditRecurringPage() {
  const { ref } = useParams({ from: '/manage/recurring/$ref/edit' })
  const navigate = useNavigate()
  const meta = useMeta()
  const money = useMoney()
  const patch = usePatchRecurring()
  const held = useRecurring({ refs: ref, limit: 1 })

  const rule = held.data?.recurring[0]
  const accounts = meta.data?.accounts ?? []
  const payees = meta.data?.payees ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        items={[
          { label: 'Manage', to: '/manage' },
          { label: 'Recurring', to: '/manage/recurring' },
          { label: 'Edit' },
        ]}
        title="Edit rule"
      />

      <Panel>
        <div className="p-5 sm:p-6">
          <PanelHead
            eyebrow="Schedule"
            description="Amount, cadence and the next due date. A different payee or account is a new rule."
          />

          {rule === undefined ? (
            <Text as="p" tone="muted" className="mt-3">
              {held.isPending ? 'Loading' : (held.error?.message ?? 'No rule with that reference.')}
            </Text>
          ) : (
            <Form<RecurringFormValues>
              className="mt-4"
              defaultValues={recurringValues(rule, money.scale.units)}
              resolver={recurringResolver}
              submitLabel="Save changes"
              onCancel={() => void navigate({ to: '/manage/recurring/$ref', params: { ref } })}
              onSubmit={(values) => {
                patch.mutate(
                  { ref, body: recurringPatch(values, money.scale.units) },
                  {
                    onSuccess: async () => {
                      await navigate({ to: '/manage/recurring/$ref', params: { ref } })
                    },
                  },
                )
              }}
            >
              {() => <RecurringFields accounts={accounts} payees={payees} />}
            </Form>
          )}

          {patch.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
              {patch.error.message}
            </Text>
          )}
        </div>
      </Panel>
    </div>
  )
}
