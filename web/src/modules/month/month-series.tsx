import type { MonthTotal } from '@/api/types'
import { Text } from '@/components/primitives/text'
import type { MoneyScale } from '@/lib/money'

import { MonthBars } from './month-bars'
import { monthBars } from './series'

/** The series, or the sentence that says there is nothing to draw yet. */
export function MonthSeries({
  months,
  scale,
  height,
}: {
  months: readonly MonthTotal[]
  scale: MoneyScale
  height?: string | undefined
}) {
  const bars = monthBars(months, scale)

  if (bars.every((bar) => bar.value === 0)) {
    return (
      <Text as="p" tone="muted">
        Nothing has moved yet.
      </Text>
    )
  }

  return <MonthBars bars={bars} height={height} />
}
