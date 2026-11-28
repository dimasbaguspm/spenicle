import { Text } from '@/components/primitives/text'

type Bar = {
  key: string
  label: string
  value: number
  title: string
}

type MonthBarsProps = {
  bars: Bar[]
  /** the track height; two charts side by side pass the same value */
  height?: string
}

/**
 * A month series as bars. Every month gets a slot, so a zero month still sits on the
 * baseline as a muted tick instead of vanishing; only the peak fills its column.
 */
export function MonthBars({ bars, height = 'h-32' }: MonthBarsProps) {
  const peak = Math.max(1, ...bars.map((bar) => bar.value))

  return (
    <ol className={`flex ${height} items-stretch gap-1.5`}>
      {bars.map((bar) => (
        <li key={bar.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className={`w-full max-w-6 rounded-sm transition-[height,background-color] duration-300 ${
                bar.value === 0 ? 'bg-ink-700' : 'bg-brass-600/70 hover:bg-brass-500'
              }`}
              style={{
                height:
                  bar.value === 0 ? '1px' : `${Math.max(3, Math.round((bar.value / peak) * 100))}%`,
              }}
              title={bar.title}
            />
          </div>
          <Text
            as="span"
            tone="caption"
            className="text-ink-500 w-full truncate text-center text-[0.5rem]"
          >
            {bar.label}
          </Text>
        </li>
      ))}
    </ol>
  )
}
