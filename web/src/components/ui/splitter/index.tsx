import { Splitter as ArkSplitter } from '@ark-ui/react/splitter'
import { Fragment, useMemo, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

type SplitterPanel = {
  id: string
  content: ReactNode
  defaultSize?: number
}

type SplitterProps = {
  panels: SplitterPanel[]
  orientation?: 'horizontal' | 'vertical'
}

/** Ark owns the drag, the keyboard resize and the aria values; the brass divider is ours. */
export function Splitter({ panels, orientation = 'horizontal' }: SplitterProps) {
  const even = 100 / Math.max(panels.length, 1)
  const vertical = orientation === 'vertical'
  const ids = useMemo(() => panels.map((panel) => ({ id: panel.id })), [panels])
  const sizes = useMemo(() => panels.map((panel) => panel.defaultSize ?? even), [panels, even])

  return (
    <ArkSplitter.Root
      orientation={orientation}
      panels={ids}
      defaultSize={sizes}
      className="min-h-0 min-w-0"
    >
      {panels.map((panel, index) => {
        const next = panels[index + 1]

        return (
          <Fragment key={panel.id}>
            <ArkSplitter.Panel id={panel.id} className="min-h-0 min-w-0 overflow-auto">
              {panel.content}
            </ArkSplitter.Panel>
            {next === undefined ? null : (
              <ArkSplitter.ResizeTrigger
                id={`${panel.id}:${next.id}`}
                type="button"
                className={cn(
                  'bg-border hover:bg-accent data-[dragging]:bg-accent data-[focus]:bg-accent shrink-0 transition-colors',
                  vertical ? 'h-1 w-full cursor-row-resize' : 'h-full w-1 cursor-col-resize',
                )}
              />
            )}
          </Fragment>
        )
      })}
    </ArkSplitter.Root>
  )
}
