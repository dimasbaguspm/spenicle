import type { PayeeReport } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { formatMoney, sumMinor, type MoneyScale } from '@/lib/money'

import { shareOf } from './overview'

/**
 * Who the money went to. The row the API sends without a ref is the spend that named nobody,
 * and it is shown rather than hidden: "you did not say who" is a fact about the year.
 */
export function PayeeBreakdown({
  payees,
  scale,
}: {
  payees: readonly PayeeReport[]
  scale: MoneyScale
}) {
  if (payees.length === 0) {
    return (
      <Text as="p" tone="muted">
        Nobody was paid in this window.
      </Text>
    )
  }

  const total = sumMinor(payees.map((row) => row.amount_minor))

  return (
    <ul className="space-y-3">
      {payees.map((row) => {
        const amount = formatMoney(row.amount_minor, scale.units)
        const name = row.payee_name ?? 'Nobody in particular'

        return (
          <li key={row.payee_ref ?? 'unnamed'} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-text min-w-0 truncate">{name}</span>
              <Text as="span" tone="figure" className="text-text-muted shrink-0 text-xs">
                {amount.toDisplay()}
              </Text>
            </div>
            <div className="bg-surface-raised/80 h-[3px] rounded-full">
              <div
                className="bg-accent-soft/70 h-[3px] rounded-full"
                style={{ width: `${String(shareOf(amount.toMinor(), total))}%` }}
                aria-hidden="true"
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
