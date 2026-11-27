import { Carousel as ArkCarousel } from '@ark-ui/react/carousel'
import type { ReactNode } from 'react'

import { Text } from '@/components/ui/text'

type CarouselSlide = {
  key: string
  content: ReactNode
}

type CarouselProps = {
  items: CarouselSlide[]
  loop?: boolean | undefined
}

const arrow =
  'border-border text-text-muted hover:text-accent flex size-7 items-center justify-center rounded-full border transition-colors disabled:opacity-40'

/** Ark owns the snap points, the drag and the loop; the two arrows and the dot row are ours. */
export function Carousel({ items, loop }: CarouselProps) {
  return (
    <ArkCarousel.Root slideCount={items.length} loop={loop} className="relative">
      <ArkCarousel.ItemGroup className="overflow-hidden">
        {items.map((item, index) => (
          <ArkCarousel.Item key={item.key} index={index} className="w-full shrink-0">
            {item.content}
          </ArkCarousel.Item>
        ))}
      </ArkCarousel.ItemGroup>
      <div className="mt-3 flex items-center justify-between gap-3">
        <ArkCarousel.PrevTrigger type="button" className={arrow}>
          <Text as="span" tone="caption" className="text-inherit">
            ‹
          </Text>
        </ArkCarousel.PrevTrigger>
        <ArkCarousel.IndicatorGroup className="flex items-center gap-1.5">
          {items.map((item, index) => (
            <ArkCarousel.Indicator
              key={item.key}
              index={index}
              type="button"
              className="bg-ink-700 data-[current]:bg-accent size-1.5 rounded-full transition-colors"
            />
          ))}
        </ArkCarousel.IndicatorGroup>
        <ArkCarousel.NextTrigger type="button" className={arrow}>
          <Text as="span" tone="caption" className="text-inherit">
            ›
          </Text>
        </ArkCarousel.NextTrigger>
      </div>
    </ArkCarousel.Root>
  )
}
