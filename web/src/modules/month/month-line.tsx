import { Text } from '@/components/primitives/text'

import type { MonthBar } from './series'

/**
 * The same series as a line: one point per month, the peak at the top of the box and a dot per
 * point so a zero month still reads as a month. The axis is the label strip below it, shared with
 * the bar chart on purpose — two renderings of one series should not disagree about names.
 */
export function MonthLine({
  bars,
  height = 'h-32',
}: {
  bars: readonly MonthBar[]
  height?: string | undefined
}) {
  const peak = Math.max(1, ...bars.map((bar) => bar.value))
  const steps = Math.max(1, bars.length - 1)
  const points = bars
    .map((bar, index) => `${(index / steps) * 100},${100 - (bar.value / peak) * 100}`)
    .join(' ')

  return (
    <div className={`flex ${height} flex-col gap-2`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="text-accent min-h-0 w-full flex-1"
        role="img"
        aria-label={bars.map((bar) => `${bar.label}: ${bar.title}`).join(', ')}
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {bars.map((bar, index) => (
          <circle
            key={bar.key}
            cx={(index / steps) * 100}
            cy={100 - (bar.value / peak) * 100}
            r={1.2}
            fill="currentColor"
            vectorEffect="non-scaling-stroke"
          >
            <title>{bar.title}</title>
          </circle>
        ))}
      </svg>

      <ol className="flex gap-1.5">
        {bars.map((bar) => (
          <li key={bar.key} className="min-w-0 flex-1">
            <Text
              as="span"
              tone="caption"
              className="text-text-faint block truncate text-center text-[0.5rem]"
            >
              {bar.label}
            </Text>
          </li>
        ))}
      </ol>
    </div>
  )
}
