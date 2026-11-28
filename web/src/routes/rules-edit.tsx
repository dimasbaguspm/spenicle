import { useNavigate, useParams } from '@tanstack/react-router'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { Form } from '@/components/ui/form'
import { useMeta } from '@/hooks/queries/use-meta'
import { usePatchRule, useRules } from '@/hooks/queries/use-rules'
import { rulePatch, RuleFields, ruleResolver, ruleValues, type RuleFormValues } from '@/modules'

/**
 * The pattern, the category and the priority. `field` and `match_kind` are the identity of a rule
 * and the API will not move them, so this page edits what a rule says, not what it looks at.
 */
export function EditRulePage() {
  const { ref } = useParams({ from: '/manage/rules/$ref/edit' })
  const navigate = useNavigate()
  const meta = useMeta()
  const patch = usePatchRule()
  const held = useRules({ limit: 200, include_archived: 'true' })

  const rule = held.data?.rules.find((row) => row.ref === ref)
  const accounts = meta.data?.accounts ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        items={[
          { label: 'Manage', to: '/manage' },
          { label: 'Rules', to: '/manage/rules' },
          { label: 'Edit' },
        ]}
        title="Edit rule"
      />

      <Panel>
        <div className="p-5 sm:p-6">
          <PanelHead
            eyebrow="Pattern"
            description="Rename the pattern, repoint the category, or settle a tie with a higher priority."
          />

          {rule === undefined ? (
            <Text as="p" tone="muted" className="mt-3">
              {held.isPending ? 'Loading' : (held.error?.message ?? 'No rule with that reference.')}
            </Text>
          ) : (
            <Form<RuleFormValues>
              className="mt-4"
              defaultValues={ruleValues(rule)}
              resolver={ruleResolver}
              submitLabel="Save changes"
              onCancel={() => void navigate({ to: '/manage/rules/$ref', params: { ref } })}
              onSubmit={(values) => {
                patch.mutate(
                  { ref, body: rulePatch(values) },
                  {
                    onSuccess: async () => {
                      await navigate({ to: '/manage/rules/$ref', params: { ref } })
                    },
                  },
                )
              }}
            >
              {() => <RuleFields accounts={accounts} />}
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
