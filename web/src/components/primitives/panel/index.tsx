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
        'relative rounded-lg border',
        tone === 'raised'
          ? [
              'border-ink-700/70 bg-ink-850/90',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_28px_56px_-36px_rgba(0,0,0,1)]',
              // the brass hairline: one lit edge, inset so it never touches the corner
              "before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-brass-500/70 before:to-transparent before:content-['']",
            ].join(' ')
          : 'border-ink-800 bg-ink-950/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]',
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
