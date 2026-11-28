import type { AccountFlow } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { formatMoney, type MoneyScale } from '@/lib/money'

/**
 * Where the money sat: what came into each account, what left it, and what the two leave. The bar
 * compares the account with itself — in on the left, out on the right — because comparing two
 * accounts of different size on one bar would say nothing about either.
 */
export function AccountFlows({
  accounts,
  scale,
}: {
  accounts: readonly AccountFlow[]
  scale: MoneyScale
}) {
  if (accounts.length === 0) {
    return (
      <Text as="p" tone="muted">
        No money account moved in this window.
      </Text>
    )
  }

  return (
    <ul className="divide-border divide-y">
      {accounts.map((flow) => {
        const inflow = formatMoney(flow.inflow_minor, scale.units)
        const outflow = formatMoney(flow.outflow_minor, scale.units)
        const net = formatMoney(flow.net_minor, scale.units)
        const movement = Number(inflow.toMinor()) + Number(outflow.toMinor())
        const inShare = movement === 0 ? 0 : Math.round((Number(inflow.toMinor()) / movement) * 100)

        return (
          <li key={flow.account_ref} className="space-y-1.5 py-2.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-text min-w-0 truncate text-sm">{flow.account_name}</span>
              <Text
                as="span"
                tone="figure"
                className={
                  net.isNegative() ? 'text-text shrink-0 text-xs' : 'text-success shrink-0 text-xs'
                }
              >
                {net.toDisplay()}
              </Text>
            </div>

            <div className="bg-surface-raised/80 flex h-[3px] gap-px overflow-hidden rounded-full">
              <span
                className="bg-success/60 h-[3px] rounded-l-full"
                style={{ width: `${String(inShare)}%` }}
                aria-hidden="true"
              />
              <span className="bg-border h-[3px] flex-1 rounded-r-full" aria-hidden="true" />
            </div>

            <Text as="p" tone="caption" className="text-text-faint text-xs">
              in {inflow.toDisplay()}, out {outflow.toDisplay()}
            </Text>
          </li>
        )
      })}
    </ul>
  )
}
