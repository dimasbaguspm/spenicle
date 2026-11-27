import { Swap as ArkSwap } from '@ark-ui/react/swap'
import type { ReactNode } from 'react'

type SwapProps = {
  /** which of the two children is visible */
  swap: boolean
  children: ReactNode
}

/**
 * Ark owns nothing but the state flag, and that is the point: the same two-node swap used
 * for a loading spinner or a checked tick, without either node remounting and losing focus.
 */
export function Swap({ swap, children }: SwapProps) {
  return (
    <ArkSwap.Root swap={swap} className="inline-grid place-items-center">
      {children}
    </ArkSwap.Root>
  )
}
