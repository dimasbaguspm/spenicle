import type { Account } from '@/api/types'
import { absent } from '@/lib/text'

/** The fields a rule row reads: what it matches, where, and which category it names. */
export type RuleLike = {
  ref: string
  pattern?: string | undefined
  field?: string | undefined
  match_kind?: string | undefined
  category_ref?: string | undefined
  priority?: number | undefined
  archived?: boolean | undefined
}

export type RuleRow = {
  ref: string
  pattern: string
  matches: string
  category: string
  priority: string
  archived: boolean
}

/** The three match kinds, read as the verb they are. */
const verbs: Record<string, string> = {
  exact: 'is exactly',
  contains: 'contains',
  prefix: 'starts with',
}

export function ruleRow(rule: RuleLike, accounts: readonly Account[]): RuleRow {
  const category = accounts.find((account) => account.ref === rule.category_ref)
  const verb = verbs[rule.match_kind ?? ''] ?? rule.match_kind ?? 'matches'

  return {
    ref: rule.ref,
    pattern: rule.pattern === undefined || rule.pattern === '' ? absent : rule.pattern,
    matches: `${rule.field ?? 'payee'} ${verb}`,
    category: category?.name ?? absent,
    priority: String(rule.priority ?? 0),
    archived: rule.archived === true,
  }
}
