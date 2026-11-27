import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon, LucideProps } from 'lucide-react'

import { cn } from '@/lib/cn'

const icon = cva('shrink-0', {
  variants: {
    size: {
      xs: 'size-3',
      sm: 'size-3.5',
      md: 'size-4',
      lg: 'size-5',
      xl: 'size-6',
    },
    variant: {
      default: '',
      muted: 'text-text-muted',
      accent: 'text-accent',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
      info: 'text-info',
    },
  },
  defaultVariants: { size: 'md', variant: 'default' },
})

type IconProps = Omit<LucideProps, 'size' | 'strokeWidth' | 'className'> &
  VariantProps<typeof icon> & {
    as: LucideIcon
    className?: string | undefined
    strokeWidth?: number | undefined
  }

/**
 * Ark has no icon component: a widget leaves the glyph to the caller. This is the one place
 * a lucide icon gets its size and colour, so no caller repeats a class.
 */
export function Icon({
  as: Glyph,
  size,
  variant,
  className,
  strokeWidth = 1.75,
  ...rest
}: IconProps) {
  return (
    <Glyph className={cn(icon({ size, variant }), className)} strokeWidth={strokeWidth} {...rest} />
  )
}
