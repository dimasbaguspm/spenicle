import type { CategoryTotal } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { formatMoney, sumMinor, type MoneyScale } from '@/lib/money'

/**
 * Where the spend went, as proportional rows. The share is integer arithmetic on minor units —
 * a bar's width is presentation, but the number behind it never becomes a float.
 */
export function CategoryBreakdown({
  categories,
  scale,
}: {
  categories: readonly CategoryTotal[]
  scale: MoneyScale
}) {
  if (categories.length === 0) {
    return (
      <Text as="p" tone="muted">
        No categorised spend in this window.
      </Text>
    )
  }

  const total = BigInt(sumMinor(categories.map((row) => row.amount_minor)))

  return (
    <ul className="space-y-3">
      {categories.map((row) => {
        const amount = formatMoney(row.amount_minor, scale.units)
        const width = total === 0n ? 0 : Number((BigInt(amount.toMinor()) * 100n) / total)

        return (
          <li key={row.account_ref} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-porcelain-100 min-w-0 truncate">{row.account_name}</span>
              <Text as="span" tone="figure" className="text-ink-300 shrink-0 text-xs">
                {amount.toDisplay()}
              </Text>
            </div>
            <div className="bg-ink-800/80 h-[3px] rounded-full">
              <div
                className="bg-brass-600/70 h-[3px] rounded-full"
                style={{ width: `${String(Math.max(width, 1))}%` }}
                aria-hidden="true"
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
