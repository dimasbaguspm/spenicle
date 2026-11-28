import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useCaptures } from '@/hooks/queries/use-captures'
import { useExports } from '@/hooks/queries/use-exports'
import { usePayees } from '@/hooks/queries/use-payees'
import { accountScope } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const manageCrumbs = [{ label: 'Manage' }] as const

/**
 * The parent of everything you keep rather than everything you read. The desk header carries one
 * tab for it, and this page is the index: five children, one line each, in the order a household
 * sets an instance up.
 */
export function ManagePage() {
  const accounts = useAccounts({ limit: 200 })
  const payees = usePayees({ limit: 200 })
  const captures = useCaptures({ status: 'pending', limit: 50 })
  const exports = useExports({ limit: 50 })

  const held = accounts.data?.accounts ?? []
  const money = held.filter((account) => accountScope(account.kind) === 'money').length
  const categories = held.length - money

  const sections = [
    {
      to: '/manage/accounts',
      label: 'Accounts',
      caption: 'What money sits in: assets, liabilities, equity.',
      count: accounts.isSuccess ? String(money) : '',
    },
    {
      to: '/manage/categories',
      label: 'Categories',
      caption: 'What money was for: expense and income.',
      count: accounts.isSuccess ? String(categories) : '',
    },
    {
      to: '/manage/payees',
      label: 'Payees',
      caption: 'Who was paid, and the defaults each name carries.',
      count: payees.isSuccess ? String(payees.data.payees.length) : '',
    },
    {
      to: '/manage/captures',
      label: 'Captures',
      caption: 'The review queue. Nothing posts itself.',
      count: captures.isSuccess ? String(captures.data.captures.length) : '',
    },
    {
      to: '/manage/exports',
      label: 'Exports',
      caption: 'The ledger as a file, rendered by the worker.',
      count: exports.isSuccess ? String(exports.data.exports.length) : '',
    },
    {
      to: '/manage/rates',
      label: 'Rates',
      caption: 'What one currency is worth in another, on a day.',
      count: '',
    },
  ] as const

  return (
    <div className="space-y-6">
      <PageHeader items={manageCrumbs} title="Manage" />

      <Panel className="divide-border divide-y">
        {sections.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className="hover:bg-surface-raised/50 flex items-center gap-4 px-5 py-4 transition-colors sm:px-6"
          >
            <span className="min-w-0 flex-1 space-y-0.5">
              <Text as="span" tone="body" className="block">
                {section.label}
              </Text>
              <Text as="span" tone="caption" className="text-text-faint block">
                {section.caption}
              </Text>
            </span>
            <Text as="span" tone="figure" className="text-text-muted shrink-0 text-xs">
              {section.count}
            </Text>
            <ArrowRight className="text-text-faint size-4 shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </Panel>
    </div>
  )
}
