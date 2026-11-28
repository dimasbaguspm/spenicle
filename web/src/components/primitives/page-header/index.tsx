import type { ReactNode } from 'react'

import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Text } from '@/components/primitives/text'

type Crumb = {
  label: string
  to?: string | undefined
}

/**
 * The top of every signed-in screen: where you are, then a name for it that is not the last crumb
 * read aloud again, one sentence under it, and one action.
 *
 * The title and its sentence are desktop-only: a phone already spends its first line on the
 * breadcrumb, and a 42px word above a list of rows is a line of scroll for nothing.
 */
export function PageHeader({
  items,
  title,
  subtitle,
  action,
}: {
  items: readonly Crumb[]
  title: string
  /** one sentence, desktop only: what this screen is for, not what the crumb already said */
  subtitle?: string | undefined
  action?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <Breadcrumb items={items} />
        <Text as="h1" tone="display" className="hidden lg:block">
          {title}
        </Text>
        {subtitle === undefined ? null : (
          <Text as="p" tone="muted" className="hidden max-w-prose leading-relaxed lg:block">
            {subtitle}
          </Text>
        )}
      </div>
      {action}
    </header>
  )
}
