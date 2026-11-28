import { Carousel as ArkCarousel } from '@ark-ui/react/carousel'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

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
        <ArkCarousel.PrevTrigger type="button" aria-label="Previous slide" className={arrow}>
          <ChevronLeft className="size-4" aria-hidden="true" strokeWidth={1.75} />
        </ArkCarousel.PrevTrigger>
        <ArkCarousel.IndicatorGroup className="flex items-center gap-1.5">
          {items.map((item, index) => (
            <ArkCarousel.Indicator
              key={item.key}
              index={index}
              type="button"
              className="bg-border data-[current]:bg-accent size-1.5 rounded-full transition-colors"
            />
          ))}
        </ArkCarousel.IndicatorGroup>
        <ArkCarousel.NextTrigger type="button" aria-label="Next slide" className={arrow}>
          <ChevronRight className="size-4" aria-hidden="true" strokeWidth={1.75} />
        </ArkCarousel.NextTrigger>
      </div>
    </ArkCarousel.Root>
  )
}
