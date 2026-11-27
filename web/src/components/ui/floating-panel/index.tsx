import { FloatingPanel as ArkFloatingPanel } from '@ark-ui/react/floating-panel'
import { Scaling } from 'lucide-react'
import type { ReactNode } from 'react'

import { Text } from '@/components/ui/text'

type FloatingPanelProps = {
  title: string
  children: ReactNode
}

/**
 * Ark owns the pointer drag, the bounded position, the resize handles and the persisted
 * stage; we own the frame. It mounts open and carries no close trigger, because a panel
 * with no caller-owned open state could never be reopened.
 */
export function FloatingPanel({ title, children }: FloatingPanelProps) {
  return (
    <ArkFloatingPanel.Root
      defaultOpen
      defaultSize={{ width: 320, height: 240 }}
      minSize={{ width: 240, height: 160 }}
    >
      <ArkFloatingPanel.Positioner>
        <ArkFloatingPanel.Content className="border-border-strong bg-surface-raised flex flex-col rounded-lg border shadow-xl">
          <ArkFloatingPanel.Header className="border-border border-b">
            <ArkFloatingPanel.DragTrigger className="cursor-grab px-3 py-2 active:cursor-grabbing">
              <ArkFloatingPanel.Title asChild>
                <Text as="h2" tone="title" className="text-base">
                  {title}
                </Text>
              </ArkFloatingPanel.Title>
            </ArkFloatingPanel.DragTrigger>
          </ArkFloatingPanel.Header>
          <ArkFloatingPanel.Body className="text-text flex-1 overflow-auto p-3 text-sm">
            {children}
          </ArkFloatingPanel.Body>
          <ArkFloatingPanel.ResizeTrigger
            axis="se"
            className="text-text-muted absolute end-0 bottom-0 cursor-se-resize p-1"
          >
            <Scaling className="size-3" aria-hidden="true" strokeWidth={1.75} />
          </ArkFloatingPanel.ResizeTrigger>
        </ArkFloatingPanel.Content>
      </ArkFloatingPanel.Positioner>
    </ArkFloatingPanel.Root>
  )
}
