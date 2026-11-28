import type { ReactNode } from 'react'

import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Text } from '@/components/primitives/text'

type Crumb = {
  label: string
  to?: string | undefined
}

/**
 * The top of every signed-in screen: where you are, then the word for it, then one action.
 *
 * There is no subtitle. A screen that needs a sentence puts it on the panel that owns the thing
 * the sentence is about, where it can be read beside what it describes.
 *
 * The title is desktop-only: a phone already spends its first line on the breadcrumb, and a
 * 42px word above a list of rows is a line of scroll for nothing.
 */
export function PageHeader({
  items,
  title,
  action,
}: {
  items: readonly Crumb[]
  title: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Breadcrumb items={items} />
        <Text as="h1" tone="display" className="hidden lg:block">
          {title}
        </Text>
      </div>
      {action}
    </header>
  )
}
