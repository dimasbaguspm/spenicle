import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Icon } from '@/components/primitives/icon'
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
    className?: string | undefined
    leadingIcon?: LucideIcon | undefined
    trailingIcon?: LucideIcon | undefined
    loading?: boolean | undefined
  }

/**
 * Ark has no Button, so this one is ours: it keeps the label and swaps in a spinner, because a
 * button that blanks while it works loses the one word the screen was about.
 */
export function Button({
  tone,
  size,
  block,
  className,
  type = 'button',
  children,
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled,
  ...rest
}: ButtonProps) {
  const iconSize = size === 'sm' ? 'xs' : 'sm'

  return (
    <button
      type={type}
      className={cn(button({ tone, size, block }), className)}
      disabled={disabled === true || loading}
      aria-busy={loading ? true : undefined}
      {...rest}
    >
      {loading ? (
        <Icon as={LoaderCircle} size={iconSize} className="animate-spin" aria-hidden="true" />
      ) : leadingIcon === undefined ? null : (
        <Icon as={leadingIcon} size={iconSize} aria-hidden="true" />
      )}
      {children}
      {trailingIcon === undefined ? null : (
        <Icon as={trailingIcon} size={iconSize} aria-hidden="true" />
      )}
    </button>
  )
}
