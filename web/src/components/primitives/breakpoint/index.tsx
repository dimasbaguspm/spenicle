import type { ReactNode } from 'react'

/**
 * Two named halves of the one breakpoint this product actually switches on. `lg` is where the
 * shell grows a header, so it is also where a screen may afford its title, its rail and its
 * full-width table. Below it, the same screen says less: a breadcrumb, a sheet, a card.
 */
export function BreakpointTablet({ children }: { children: ReactNode }) {
  return <div className="lg:hidden">{children}</div>
}

export function BreakpointDesktop({ children }: { children: ReactNode }) {
  return <div className="hidden lg:block">{children}</div>
}
