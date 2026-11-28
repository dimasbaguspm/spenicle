import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { Form } from '@/components/ui/form'
import { useCreateRecurring } from '@/hooks/queries/use-recurring'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { DateFormat, formatDate } from '@/lib/date'
import {
  RecurringFields,
  recurringBody,
  recurringResolver,
  type RecurringFormValues,
} from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const crumbs = [
  { label: 'Manage', to: '/manage' },
  { label: 'Recurring', to: '/manage/recurring' },
  { label: 'New rule' },
] as const

/**
 * One page for one decision. The date is chosen once and a monthly rule takes its day of the month
 * from it, so the form asks for six things and never for the same thing twice.
 */
export function NewRecurringPage() {
  const navigate = useNavigate()
  const meta = useMeta()
  const money = useMoney()
  const create = useCreateRecurring()
  const [today] = useState(() => formatDate(new Date(), DateFormat.Iso))

  const accounts = meta.data?.accounts ?? []
  const payees = meta.data?.payees ?? []

  return (
    <div className="space-y-6">
      <PageHeader items={crumbs} title="New rule" />

      <Panel>
        <div className="p-5 sm:p-6">
          <PanelHead
            eyebrow="Schedule"
            description="A due rule becomes a capture, never an entry. You approve what it was."
          />

          {meta.isSuccess ? (
            <Form<RecurringFormValues>
              className="mt-4"
              defaultValues={{
                payeeRef: payees[0]?.ref ?? '',
                categoryRef: '',
                accountRef: '',
                amount: '',
                cadence: 'monthly',
                nextDueOn: today,
              }}
              resolver={recurringResolver}
              submitLabel="Save rule"
              onCancel={() => void navigate({ to: '/manage/recurring' })}
              onSubmit={(values) => {
                const body = recurringBody(values, money.scale.currency, money.scale.units)

                if (body === undefined) {
                  return
                }

                create.mutate(body, {
                  onSuccess: async (rule) => {
                    await navigate({ to: '/manage/recurring/$ref', params: { ref: rule.ref } })
                  },
                })
              }}
            >
              {() => <RecurringFields accounts={accounts} payees={payees} />}
            </Form>
          ) : (
            <Text as="p" tone="muted" className="mt-3">
              Loading the payees and accounts to pick from…
            </Text>
          )}

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
