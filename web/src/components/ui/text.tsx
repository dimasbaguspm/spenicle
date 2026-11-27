import type { ElementType, HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

type TextAs =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'span'
  | 'label'
  | 'pre'
  | 'code'
  | 'strong'
  | 'em'
  | 'small'

type TextProps = HTMLAttributes<HTMLElement> & {
  /** the element to render; the look comes from `tone`, never from the tag alone */
  as?: TextAs
  tone?: 'display' | 'title' | 'section' | 'body' | 'muted' | 'caption' | 'code'
  children: ReactNode
}

const tones: Record<NonNullable<TextProps['tone']>, string> = {
  display: 'font-display text-porcelain-50 text-3xl font-semibold tracking-tight',
  title: 'font-display text-porcelain-50 text-xl font-semibold',
  section: 'text-brass-500 text-xs font-medium tracking-[0.14em] uppercase',
  body: 'text-text text-sm',
  muted: 'text-text-muted text-sm',
  caption: 'text-ink-300 text-xs',
  code: 'text-porcelain-200 font-mono text-xs',
}

/**
 * The one text primitive: a tag decides the semantics, `tone` decides the look. A
 * screen can write `as="label"` and let Ark's field clone `htmlFor` onto it, and the
 * type scale stays in this file instead of in twenty `className` strings.
 */
export function Text({ as = 'p', tone = 'body', className, children, ...rest }: TextProps) {
  const Tag = as as ElementType

  return (
    <Tag className={cn(tones[tone], className)} {...rest}>
      {children}
    </Tag>
  )
}
