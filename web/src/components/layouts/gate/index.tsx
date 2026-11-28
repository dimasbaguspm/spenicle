import type { ReactNode } from 'react'

import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'

/**
 * The two screens a visitor sees before they hold a credential: a statement on the left, the
 * plate that answers it on the right. One column below `lg`, where the statement shrinks to a
 * heading and the plate is the page. The wordmark is the shell's footer, so it is not repeated
 * here.
 */
export function Gate({
  title,
  description,
  aside,
  children,
}: {
  title: string
  description: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:gap-16">
      <div className="space-y-6">
        <div className="space-y-3">
          <Text as="h1" tone="display">
            {title}
          </Text>
          <Text as="p" tone="muted" className="max-w-md leading-relaxed">
            {description}
          </Text>
        </div>
        {aside}
      </div>

      <Panel className="p-5 sm:p-7">{children}</Panel>
    </div>
  )
}
