import type { HTMLAttributes, ReactNode } from 'react'

import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

type PanelProps = HTMLAttributes<HTMLElement> & {
  /** the element to render; a panel is a region, so `section` is the honest default */
  as?: 'section' | 'div' | 'article' | 'aside'
  tone?: 'raised' | 'sunken'
  children: ReactNode
}

/**
 * The one plate: every card, form and list in the product sits on it. Raised is ink
 * over paper with a lit top edge; sunken is a well cut into the page. A screen never
 * writes its own border and shadow, so a re-theme is this file.
 */
export function Panel({
  as = 'section',
  tone = 'raised',
  className,
  children,
  ...rest
}: PanelProps) {
  const Tag = as

  return (
    <Tag
      className={cn(
        'rounded-lg border',
        tone === 'raised' ? 'border-ink-800 bg-ink-900/40' : 'border-ink-800/60 border-dashed',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

type PanelHeadProps = {
  /** the brass word that names the panel; a panel with no eyebrow starts with `title` */
  eyebrow?: string | undefined
  title?: string | undefined
  description?: string | undefined
  /** one control on the right, usually a button or a count */
  action?: ReactNode
}

/** The top third of a panel: a brass eyebrow, a serif title, one muted line, one action. */
export function PanelHead({ eyebrow, title, description, action }: PanelHeadProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        {eyebrow === undefined ? null : (
          <Text as="p" tone="section">
            {eyebrow}
          </Text>
        )}
        {title === undefined ? null : (
          <Text as="h2" tone="title" className="truncate">
            {title}
          </Text>
        )}
        {description === undefined ? null : (
          <Text as="p" tone="muted" className="text-[0.8125rem] leading-relaxed">
            {description}
          </Text>
        )}
      </div>
      {action === undefined ? null : <div className="shrink-0">{action}</div>}
    </div>
  )
}
