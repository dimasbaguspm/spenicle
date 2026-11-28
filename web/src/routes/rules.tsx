import { Schema } from 'effect'
import type { Resolver } from 'react-hook-form'
import { useState } from 'react'

import type { Account, RuleCreate } from '@/api/types'
import { Field } from '@/components/primitives/field'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { Form, SelectField, TextField } from '@/components/ui/form'
import { useMeta } from '@/hooks/queries/use-meta'
import { useCreateRule, usePatchRule, useRules, useSuggestion } from '@/hooks/queries/use-rules'
import { isCategoryKind, RuleList, ruleRow } from '@/modules'

const RuleForm = Schema.Struct({
  pattern: Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
  field: Schema.NonEmptyString,
  matchKind: Schema.NonEmptyString,
  categoryRef: Schema.NonEmptyString,
})

type RuleFormValues = typeof RuleForm.Type

const resolver: Resolver<RuleFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(RuleForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

const fieldOptions = [
  { label: 'Payee', value: 'payee' },
  { label: 'Note', value: 'note' },
]

/** `exact` only ever applies to a payee name, so the note field offers the two substring kinds. */
const matchOptions = [
  { label: 'Contains', value: 'contains' },
  { label: 'Starts with', value: 'prefix' },
  { label: 'Is exactly', value: 'exact' },
]

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const ruleCrumbs = [{ label: 'Manage', to: '/manage' }, { label: 'Rules' }] as const

/**
 * What the ledger pre-fills, and why. A rule is a pattern, the field it is read from and a match
 * kind, so the answer is repeatable: the panel below asks the same question the entry form asks,
 * and prints the reason it got.
 */
export function RulesPage() {
  const rules = useRules({ limit: 200, include_archived: 'true' })
  const meta = useMeta()
  const patch = usePatchRule()

  const accounts = meta.data?.accounts ?? []
  const rows = (rules.data?.rules ?? []).map((rule) => ruleRow(rule, accounts))

  return (
    <div className="space-y-6">
      <PageHeader items={ruleCrumbs} title="Rules" />

      <NewRule accounts={accounts} ready={meta.isSuccess} />

      <Suggestion accounts={accounts} />

      {rules.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {rules.error.message}
        </Text>
      )}

      {rows.length === 0 ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              {rules.isPending
                ? 'Loading…'
                : 'No rules yet. One pattern and one category is enough to stop filing the same shop twice.'}
            </Text>
          </div>
        </Panel>
      ) : (
        <Panel>
          <RuleList
            rows={rows}
            onToggle={(row) => {
              patch.mutate({ ref: row.ref, body: { archived: !row.archived } })
            }}
          />
        </Panel>
      )}

      {patch.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {patch.error.message}
        </Text>
      )}
    </div>
  )
}

function NewRule({ accounts, ready }: { accounts: readonly Account[]; ready: boolean }) {
  const create = useCreateRule()

  const categoryOptions = accounts
    .filter((account) => isCategoryKind(account.kind))
    .map((account) => ({ label: account.name, value: account.ref }))

  return (
    <Panel>
      <div className="p-5 sm:p-6">
        <PanelHead
          eyebrow="New rule"
          description="A rule suggests a category. It never posts: approving a capture still decides."
        />

        {ready ? (
          <Form<RuleFormValues>
            className="mt-4"
            defaultValues={{
              pattern: '',
              field: 'payee',
              matchKind: 'contains',
              categoryRef: categoryOptions[0]?.value ?? '',
            }}
            resolver={resolver}
            submitLabel="Save rule"
            onSubmit={(values) => {
              const body: RuleCreate = {
                pattern: values.pattern,
                field: values.field,
                match_kind: values.matchKind,
                category_ref: values.categoryRef,
              }

              create.mutate(body)
            }}
          >
            {(form) => (
              <>
                <TextField<RuleFormValues>
                  name="pattern"
                  label="Pattern"
                  placeholder="indomaret, grab, salary…"
                />
                <SelectField<RuleFormValues> name="field" label="Look in" options={fieldOptions} />
                <SelectField<RuleFormValues>
                  name="matchKind"
                  label="Match"
                  options={form.watch('field') === 'note' ? matchOptions.slice(0, 2) : matchOptions}
                />
                <SelectField<RuleFormValues>
                  name="categoryRef"
                  label="Category"
                  options={categoryOptions}
                  placeholder="pick a category…"
                />
              </>
            )}
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
  )
}

/** The same question the entry form asks, asked out loud: which category, and on what grounds. */
function Suggestion({ accounts }: { accounts: readonly Account[] }) {
  const [text, setText] = useState('')
  const answer = useSuggestion(text.trim() === '' ? {} : { text: text.trim() })

  return (
    <Panel>
      <div className="space-y-3 p-5 sm:p-6">
        <PanelHead
          eyebrow="Try a line"
          description="A payee name or a raw statement line. Nothing is written."
        />

        <Field label="Line">
          <TextInput
            name="suggest-text"
            placeholder="INDOMARET 09 SAM RATULANGI"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
            }}
          />
        </Field>

        {answer.data === undefined ? (
          <Text as="p" tone="muted">
            {answer.error === null
              ? 'Type a line to see what this instance would pre-fill.'
              : answer.error.message}
          </Text>
        ) : (
          <div className="border-border space-y-1 rounded-md border p-4">
            <Text as="p" tone="body">
              {accounts.find((account) => account.ref === answer.data.account_ref)?.name ??
                answer.data.account_name}
            </Text>
            <Text as="p" tone="caption">
              {answer.data.why}
            </Text>
            <Text as="p" tone="caption" className="text-text-faint">
              {answer.data.tier === 'none' ? 'nothing matched' : answer.data.tier}
              {answer.data.rule_ref === undefined
                ? ''
                : `, rule ${answer.data.rule_ref.slice(0, 8)}`}
            </Text>
          </div>
        )}
      </div>
    </Panel>
  )
}
