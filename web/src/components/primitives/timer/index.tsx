import { Timer as ArkTimer } from '@ark-ui/react/timer'
import { Pause, Play, RotateCcw } from 'lucide-react'

import { Button } from '@/components/primitives/button'

type TimerProps = {
  /** the duration the countdown starts at, in milliseconds */
  targetMs: number
}

/**
 * Ark owns the tick clock, the pause/resume state machine and the split into time parts;
 * we own the numerals and the button row. `resume` is a fourth trigger because Ark hides
 * `start` while the timer is paused, so without it a paused timer could never restart.
 */
export function Timer({ targetMs }: TimerProps) {
  return (
    <ArkTimer.Root
      countdown
      startMs={targetMs}
      targetMs={0}
      className="border-border bg-surface-sunken inline-flex flex-col gap-3 rounded-md border p-4"
    >
      <ArkTimer.Area className="text-text font-mono text-2xl tabular-nums">
        <ArkTimer.Item type="minutes" />
        <ArkTimer.Separator className="px-1">:</ArkTimer.Separator>
        <ArkTimer.Item type="seconds" />
      </ArkTimer.Area>
      <ArkTimer.Control className="flex items-center gap-1">
        <ArkTimer.ActionTrigger action="start" asChild>
          <Button tone="quiet" size="sm">
            <Play className="size-4" aria-hidden="true" strokeWidth={1.75} />
            Start
          </Button>
        </ArkTimer.ActionTrigger>
        <ArkTimer.ActionTrigger action="pause" asChild>
          <Button tone="quiet" size="sm">
            <Pause className="size-4" aria-hidden="true" strokeWidth={1.75} />
            Pause
          </Button>
        </ArkTimer.ActionTrigger>
        <ArkTimer.ActionTrigger action="resume" asChild>
          <Button tone="quiet" size="sm">
            <Play className="size-4" aria-hidden="true" strokeWidth={1.75} />
            Resume
          </Button>
        </ArkTimer.ActionTrigger>
        <ArkTimer.ActionTrigger action="reset" asChild>
          <Button tone="quiet" size="sm">
            <RotateCcw className="size-4" aria-hidden="true" strokeWidth={1.75} />
            Reset
          </Button>
        </ArkTimer.ActionTrigger>
      </ArkTimer.Control>
    </ArkTimer.Root>
  )
}
