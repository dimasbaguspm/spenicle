import { Toc as ArkToc } from '@ark-ui/react/toc'
import { useMemo } from 'react'
import { Text } from '@/components/primitives/text'

type TocEntry = {
  value: string
  label: string
  url: string
}

type TocProps = {
  items: TocEntry[]
}

/** Ark owns the heading observation and the active flag; the rail and the link skin are ours. */
export function Toc({ items }: TocProps) {
  const entries = useMemo(
    () =>
      items.map((item) => ({
        value: item.value,
        label: item.label,
        url: item.url,
        depth: 2,
      })),
    [items],
  )

  return (
    <ArkToc.Root items={entries} className="min-w-0">
      <ArkToc.Nav>
        <ArkToc.List className="space-y-1">
          {entries.map((entry) => (
            <ArkToc.Item
              key={entry.value}
              item={entry}
              className="border-border text-text-muted data-[active]:border-accent data-[active]:text-text border-l-2 pl-3 transition-colors"
            >
              <ArkToc.Link href={entry.url} className="block py-0.5">
                <Text as="span" tone="muted" className="text-inherit">
                  {entry.label}
                </Text>
              </ArkToc.Link>
            </ArkToc.Item>
          ))}
        </ArkToc.List>
      </ArkToc.Nav>
    </ArkToc.Root>
  )
}
