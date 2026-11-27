import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/cn'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      tone: {
        primary: 'bg-primary text-porcelain-50 hover:bg-primary-hover',
        quiet: 'border-border text-text hover:border-border-strong border hover:text-porcelain-50',
        danger: 'border-oxblood-600 text-oxblood-300 hover:bg-oxblood-600/15 border',
        ghost: 'text-text-muted hover:text-accent',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { tone: 'primary', size: 'md', block: false },
  },
)

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> &
  VariantProps<typeof button> & {
    children: ReactNode
    className?: string
  }

export function Button({ tone, size, block, className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cn(button({ tone, size, block }), className)} {...rest} />
}
