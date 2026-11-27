import { cva, type VariantProps } from 'class-variance-authority'
import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

/**
 * A plain input on purpose: an amount is a string of minor units, so this never
 * becomes a numeric field that a browser could round. `invalid` is the only state
 * the design has, and it is driven by the form, not by the browser.
 */
const input = cva(
  'border-border bg-surface text-text placeholder:text-ink-400 w-full rounded border outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25',
  {
    variants: {
      invalid: {
        true: 'border-danger focus:border-danger focus:ring-danger/25',
        false: '',
      },
      size: {
        sm: 'px-2 py-1.5 text-sm',
        md: 'px-3 py-2',
      },
    },
    defaultVariants: { invalid: false, size: 'md' },
  },
)

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'> &
  VariantProps<typeof input> & {
    className?: string
  }

export function Input({ invalid, size, className, ...rest }: InputProps) {
  return <input className={cn(input({ invalid, size }), className)} {...rest} />
}
