import type { AccountFlow } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { formatMoney, sumMinor, type MoneyScale } from '@/lib/money'

/** Six accounts is where a brief stops being a brief; the register is one click away for the rest. */
const rows = 6

const movement = (flow: AccountFlow) => Number(flow.inflow_minor) + Number(flow.outflow_minor)

/**
 * Where the money sat: what came into an account, what left it, and what the two leave. Ranked by
 * movement rather than by net — an account that took fifty thousand and paid it all out is where
 * the money sat, even though nothing is left in it — and cut to six, because a household with a
 * hundred wallets should read six of them here and the full list in the register.
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

  const ranked = accounts.toSorted((left, right) => movement(right) - movement(left))
  const shown = ranked.slice(0, rows)
  const rest = ranked.slice(rows)

  return (
    <div className="space-y-3">
      <ul className="divide-border divide-y">
        {shown.map((flow) => {
          const inflow = formatMoney(flow.inflow_minor, scale.units)
          const outflow = formatMoney(flow.outflow_minor, scale.units)
          const net = formatMoney(flow.net_minor, scale.units)
          const total = movement(flow)
          const inShare = total === 0 ? 0 : Math.round((Number(inflow.toMinor()) / total) * 100)

          return (
            <li key={flow.account_ref} className="space-y-1.5 py-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-text min-w-0 truncate text-sm">{flow.account_name}</span>
                <Text
                  as="span"
                  tone="figure"
                  className={
                    net.isNegative()
                      ? 'text-text shrink-0 text-xs'
                      : 'text-success shrink-0 text-xs'
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

      {rest.length === 0 ? null : (
        <Text as="p" tone="caption" className="text-text-faint">
          {String(rest.length)} more accounts, net{' '}
          {formatMoney(sumMinor(rest.map((flow) => flow.net_minor)), scale.units).toDisplay()}
        </Text>
      )}
    </div>
  )
}
