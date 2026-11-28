import { cva, type VariantProps } from 'class-variance-authority'

/**
 * One control surface for every field input: same border, same focus ring, same
 * invalid tint. The inputs differ in which headless widget renders them, never in
 * how they look, so the styles live once.
 *
 * The font is 16px under `sm` on purpose: anything smaller makes iOS zoom the whole
 * page the moment the field takes focus, and a form that jumps is a form nobody
 * trusts. From `sm` up the type scale takes over again.
 */
export const control = cva(
  [
    'w-full rounded-md border bg-transparent text-porcelain-100',
    'placeholder:text-ink-500',
    'border-ink-700 hover:border-ink-600',
    'transition-colors duration-150',
    'focus:border-brass-600 focus:bg-ink-950/40 focus:outline-none',
    'focus:ring-1 focus:ring-brass-600/40',
    'data-[invalid]:border-oxblood-500 data-[invalid]:focus:border-oxblood-400',
    'data-[invalid]:focus:ring-oxblood-500/30',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      size: {
        sm: 'h-10 px-3 text-sm',
        md: 'h-11 px-3.5 text-base sm:text-sm',
      },
    },
    defaultVariants: { size: 'md' },
  },
)

export type ControlSize = VariantProps<typeof control>['size']
