import type { CategoryTotal } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { formatMoney, sumMinor, type MoneyScale } from '@/lib/money'

/** Six ramps, cycled: a category is a colour, and a seventh category reuses the first. */
const ramps = [
  'var(--color-cherry-500)',
  'var(--color-brass-500)',
  'var(--color-jade-500)',
  'var(--color-amber-500)',
  'var(--color-ink-400)',
  'var(--color-cherry-300)',
] as const

/**
 * The same report as a pie. The slices are worked out in whole minor units — the angle is
 * presentation, the amount behind it never becomes a float — and the legend carries the figures,
 * because a pie without numbers is a decoration.
 */
export function CategoryPie({
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

  // a window can answer signed amounts: a slice is a share of the money moved, so it is unsigned
  const sizes = categories.map((row) => {
    const minor = row.amount_minor.startsWith('-') ? row.amount_minor.slice(1) : row.amount_minor

    return { row, minor }
  })
  const total = BigInt(sumMinor(sizes.map((size) => size.minor)))
  const shares = sizes.map(({ minor }) =>
    total === 0n ? 0 : Number((BigInt(minor) * 1000n) / total) / 10,
  )
  const starts = shares.map((_, index) =>
    shares.slice(0, index).reduce((sum, value) => sum + value, 0),
  )
  const slices = sizes.map(({ row, minor }, index) => ({
    ref: row.account_ref,
    name: row.account_name,
    amount: formatMoney(minor, scale.units).toDisplay(),
    share: shares[index] ?? 0,
    from: starts[index] ?? 0,
    colour: ramps[index % ramps.length] ?? ramps[0],
  }))

  const gradient = slices
    .map((slice) => `${slice.colour} ${String(slice.from)}% ${String(slice.from + slice.share)}%`)
    .join(', ')

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        className="border-border size-40 shrink-0 rounded-full border"
        style={{ backgroundImage: `conic-gradient(${gradient})` }}
        aria-hidden="true"
      />

      <ul className="min-w-40 flex-1 space-y-2">
        {slices.map((slice) => (
          <li key={slice.ref} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: slice.colour }}
              aria-hidden="true"
            />
            <span className="text-text min-w-0 flex-1 truncate">{slice.name}</span>
            <Text as="span" tone="figure" className="text-text-muted shrink-0 text-xs">
              {slice.amount}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  )
}
