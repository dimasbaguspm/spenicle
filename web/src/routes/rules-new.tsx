import { useNavigate } from '@tanstack/react-router'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { Form } from '@/components/ui/form'
import { useMeta } from '@/hooks/queries/use-meta'
import { useCreateRule } from '@/hooks/queries/use-rules'
import { ruleBody, RuleFields, ruleResolver, type RuleFormValues } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const crumbs = [
  { label: 'Manage', to: '/manage' },
  { label: 'Rules', to: '/manage/rules' },
  { label: 'New rule' },
] as const

/** One rule, taught once: a pattern, where to look, how to match and the category it answers. */
export function NewRulePage() {
  const navigate = useNavigate()
  const meta = useMeta()
  const create = useCreateRule()

  const accounts = meta.data?.accounts ?? []
  const defaultCategory = accounts.find((account) => account.kind === 'expense')?.ref ?? ''

  return (
    <div className="space-y-6">
      <PageHeader items={crumbs} title="New rule" />

      <Panel>
        <div className="p-5 sm:p-6">
          <PanelHead
            eyebrow="Pattern"
            description="A rule suggests a category. It never posts: approving a capture still decides."
          />

          {meta.isSuccess ? (
            <Form<RuleFormValues>
              className="mt-4"
              defaultValues={{
                pattern: '',
                field: 'payee',
                matchKind: 'contains',
                categoryRef: defaultCategory,
                priority: '0',
              }}
              resolver={ruleResolver}
              submitLabel="Save rule"
              onCancel={() => void navigate({ to: '/manage/rules' })}
              onSubmit={(values) => {
                create.mutate(ruleBody(values), {
                  onSuccess: async (rule) => {
                    await navigate({ to: '/manage/rules/$ref', params: { ref: rule.ref } })
                  },
                })
              }}
            >
              {() => <RuleFields accounts={accounts} />}
            </Form>
          ) : (
            <Text as="p" tone="muted" className="mt-3">
              Loading the categories to point at…
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
