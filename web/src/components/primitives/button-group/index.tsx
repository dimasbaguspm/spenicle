import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type ButtonGroupProps = {
  children: ReactNode
  /** square the inner corners and overlap the borders, so the row reads as one control */
  attached?: boolean | undefined
  className?: string | undefined
}

/**
 * Presentational only: Ark has no button group, so this is a plain row. The children keep their
 * own behaviour; the only thing decided here is where their borders meet.
 */
export function ButtonGroup({ children, attached = false, className }: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center',
        attached &&
          '[&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child)]:-ml-px',
        className,
      )}
    >
      {children}
    </div>
  )
}
