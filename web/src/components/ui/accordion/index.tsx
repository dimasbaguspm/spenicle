import { Accordion as ArkAccordion } from '@ark-ui/react/accordion'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

type AccordionEntry = {
  value: string
  trigger: string
  content: ReactNode
}

type AccordionProps = {
  items: AccordionEntry[]
  multiple?: boolean | undefined
}

/**
 * Ark owns the height animation, the aria-expanded wiring and the open-value set; we own
 * the rows and the chevron, which turns on the indicator's own `data-state`.
 */
export function Accordion({ items, multiple }: AccordionProps) {
  return (
    <ArkAccordion.Root
      multiple={multiple}
      collapsible
      className="border-border divide-border divide-y rounded-md border"
    >
      {items.map((item) => (
        <ArkAccordion.Item key={item.value} value={item.value}>
          <ArkAccordion.ItemTrigger className="text-text hover:text-porcelain-50 flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors">
            {item.trigger}
            <ArkAccordion.ItemIndicator className="text-text-muted transition-transform data-[state=open]:rotate-180">
              <ChevronDown className="size-4" aria-hidden="true" strokeWidth={1.75} />
            </ArkAccordion.ItemIndicator>
          </ArkAccordion.ItemTrigger>
          <ArkAccordion.ItemContent className="text-text-muted px-3 pb-3 text-sm">
            {item.content}
          </ArkAccordion.ItemContent>
        </ArkAccordion.Item>
      ))}
    </ArkAccordion.Root>
  )
}
