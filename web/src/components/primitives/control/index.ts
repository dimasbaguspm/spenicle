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
    'w-full rounded-md border bg-ink-950/60 text-porcelain-100',
    'placeholder:text-ink-400',
    'border-ink-700 hover:border-ink-600',
    // camera-obscura inset: the field sits *into* the plate, not on top of it
    'shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)]',
    'transition-[border-color,box-shadow,background-color] duration-150',
    'focus:border-brass-500 focus:bg-ink-950/80 focus:outline-none',
    'focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.55),0_0_0_3px_rgba(217,185,107,0.18)]',
    'data-[invalid]:border-oxblood-500 data-[invalid]:focus:border-oxblood-400',
    'data-[invalid]:focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.55),0_0_0_3px_rgba(194,85,85,0.2)]',
    'disabled:cursor-not-allowed disabled:opacity-55',
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
