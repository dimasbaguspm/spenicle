import { Schema } from 'effect'
import type { Resolver } from 'react-hook-form'

import type { Account, Rule, RuleCreate, RulePatch } from '@/api/types'
import { SelectField, TextField } from '@/components/ui/form'
import { isCategoryKind } from '@/modules/account'

export const ruleForm = Schema.Struct({
  pattern: Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
  field: Schema.NonEmptyString,
  matchKind: Schema.NonEmptyString,
  categoryRef: Schema.NonEmptyString,
  priority: Schema.String,
})

export type RuleFormValues = typeof ruleForm.Type

export const ruleResolver: Resolver<RuleFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(ruleForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

export const ruleFieldOptions = [
  { label: 'Payee', value: 'payee' },
  { label: 'Note', value: 'note' },
]

/** `exact` only ever applies to a payee name, so the note field offers the two substring kinds. */
export const ruleMatchOptions = [
  { label: 'Contains', value: 'contains' },
  { label: 'Starts with', value: 'prefix' },
  { label: 'Is exactly', value: 'exact' },
]

/** The four fields that are the identity of a rule, and the priority that orders it. */
export function RuleFields({ accounts }: { accounts: readonly Account[] }) {
  const categoryOptions = accounts
    .filter((account) => isCategoryKind(account.kind))
    .map((account) => ({ label: account.name, value: account.ref }))

  return (
    <>
      <TextField<RuleFormValues> name="pattern" label="Pattern" placeholder="indomaret, grab" />
      <SelectField<RuleFormValues> name="field" label="Look in" options={ruleFieldOptions} />
      <SelectField<RuleFormValues> name="matchKind" label="Match" options={ruleMatchOptions} />
      <SelectField<RuleFormValues>
        name="categoryRef"
        label="Category"
        options={categoryOptions}
        placeholder="pick a category"
      />
      <TextField<RuleFormValues> name="priority" label="Priority" placeholder="0" />
    </>
  )
}

const priority = (value: string): number => {
  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) ? parsed : 0
}

export function ruleBody(values: RuleFormValues): RuleCreate {
  return {
    pattern: values.pattern,
    field: values.field,
    match_kind: values.matchKind,
    category_ref: values.categoryRef,
    priority: priority(values.priority),
  }
}

/** The identity is immutable, so an edit is the pattern, the category and the priority. */
export function rulePatch(values: RuleFormValues): RulePatch {
  return {
    pattern: values.pattern,
    category_ref: values.categoryRef,
    priority: priority(values.priority),
  }
}

export function ruleValues(rule: Rule): RuleFormValues {
  return {
    pattern: rule.pattern,
    field: rule.field,
    matchKind: rule.match_kind,
    categoryRef: rule.category_ref,
    priority: String(rule.priority),
  }
}
