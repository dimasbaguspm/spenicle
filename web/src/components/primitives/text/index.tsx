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
  tone?: 'display' | 'title' | 'section' | 'body' | 'muted' | 'caption' | 'code' | 'figure'
  children: ReactNode
}

const tones: Record<NonNullable<TextProps['tone']>, string> = {
  // the one serif: a wordmark, a screen title, an empty state — nothing else
  display:
    'font-display text-porcelain-50 text-[2.125rem] leading-[1.02] font-semibold tracking-[-0.025em] sm:text-[2.625rem]',
  title: 'font-display text-porcelain-50 text-xl leading-tight font-semibold',
  // a quiet eyebrow above a panel: mono, wide-tracked, never a heading by itself
  section: 'text-ink-400 font-mono text-[0.625rem] leading-none tracking-[0.18em] uppercase',
  body: 'text-porcelain-200 text-sm',
  muted: 'text-ink-300 text-sm',
  caption: 'text-ink-400 text-xs leading-relaxed',
  code: 'text-porcelain-300 font-mono text-[0.8125rem] tracking-tight',
  // every money amount and every date: one width per digit, in a column
  figure: 'text-porcelain-100 font-mono text-sm tabular-nums tracking-tight',
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
