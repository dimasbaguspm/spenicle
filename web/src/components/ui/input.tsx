import { Field } from '@ark-ui/react/field'
import { cva, type VariantProps } from 'class-variance-authority'
import type { InputHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

/**
 * Ark's `Field.Input`, so the id and the aria-describedby that Ui Field renders land
 * on the control without a screen passing them. A plain `<input>` on purpose: an
 * amount is a string of minor units, and a numeric widget would tempt a float.
 */
const input = cva(
  'border-border bg-surface text-text placeholder:text-ink-400 w-full rounded border outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25 data-[invalid]:border-danger data-[invalid]:focus:ring-danger/25',
  {
    variants: {
      size: {
        sm: 'px-2 py-1.5 text-sm',
        md: 'px-3 py-2',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size'> &
  VariantProps<typeof input> & {
    className?: string
  }

export function Input({ size, className, ...rest }: InputProps) {
  return <Field.Input className={cn(input({ size }), className)} {...rest} />
}
