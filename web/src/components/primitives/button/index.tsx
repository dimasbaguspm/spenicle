import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Icon } from '@/components/primitives/icon'
import { cn } from '@/lib/cn'

/**
 * A button is a lacquered plate: a solid fill, a lit top edge and a shadow that
 * makes it sit above the paper. Pressing it moves it down by a pixel, not by a
 * scale, because a ledger should not wobble.
 */
export const buttonStyles = cva(
  [
    'relative inline-flex items-center justify-center gap-2 rounded-md font-medium',
    'select-none whitespace-nowrap',
    'transition-colors duration-150',
    'focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2',
    'focus-visible:ring-offset-ink-950 focus-visible:outline-none',
    // a disabled button is not a faded button: it loses its lacquer entirely
    'disabled:pointer-events-none disabled:border-border disabled:bg-surface disabled:text-text-faint',
  ].join(' '),
  {
    variants: {
      tone: {
        primary: 'text-on-primary border border-primary bg-primary hover:bg-primary-hover',
        quiet:
          'text-text border border-border bg-transparent hover:border-border-strong hover:bg-surface hover:text-text',
        ghost:
          'text-text-muted hover:bg-surface-raised/70 hover:text-text border border-transparent',
        danger: [
          'text-danger hover:text-danger',
          'bg-danger/10 hover:bg-danger/20',
          'border border-danger/60 hover:border-danger',
        ].join(' '),
      },
      size: {
        sm: 'h-9 px-3 text-[0.8125rem]',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-sm',
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
  VariantProps<typeof buttonStyles> & {
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
      className={cn(buttonStyles({ tone, size, block }), className)}
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
