import { Progress as ArkProgress } from '@ark-ui/react/progress'

import { Text } from '@/components/ui/text'

type ProgressProps = {
  value: number
  max?: number
  label?: string | undefined
  shape?: 'linear' | 'circle'
}

/** Ark owns the aria-valuenow math; brass owns the fill. */
export function Progress({ value, max = 100, label, shape = 'linear' }: ProgressProps) {
  return (
    <ArkProgress.Root value={value} max={max} className="space-y-1.5">
      {label === undefined ? null : (
        <ArkProgress.Label asChild>
          <Text as="p" tone="caption">
            {label}
          </Text>
        </ArkProgress.Label>
      )}
      {shape === 'linear' ? (
        <ArkProgress.Track className="bg-ink-800 h-1.5 w-full overflow-hidden rounded-full">
          <ArkProgress.Range className="bg-accent block h-full transition-[width]" />
        </ArkProgress.Track>
      ) : (
        <ArkProgress.Circle className="size-16">
          <ArkProgress.CircleTrack className="stroke-ink-800" strokeWidth="6" />
          <ArkProgress.CircleRange className="stroke-accent" strokeWidth="6" />
        </ArkProgress.Circle>
      )}
    </ArkProgress.Root>
  )
}
