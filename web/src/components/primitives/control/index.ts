import { cva, type VariantProps } from 'class-variance-authority'

/**
 * One control surface for every field input: same border, same focus ring, same
 * invalid tint. The inputs differ in which headless widget renders them, never in
 * how they look, so the styles live once.
 */
export const control = cva(
  'border-border bg-surface text-text placeholder:text-ink-400 w-full rounded border outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25 data-[invalid]:border-danger data-[invalid]:focus:ring-danger/25 disabled:opacity-50',
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

export type ControlSize = VariantProps<typeof control>['size']
