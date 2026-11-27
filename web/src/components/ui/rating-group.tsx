import { RatingGroup as ArkRatingGroup } from '@ark-ui/react/rating-group'

type RatingGroupProps = {
  value: number
  count?: number | undefined
  onValueChange: (value: number) => void
}

/** Ark owns the hover/preview maths and the hidden input; the brass stars and their half state are ours. */
export function RatingGroup({ value, count = 5, onValueChange }: RatingGroupProps) {
  const stars = Array.from({ length: count }, (_, position) => position + 1)

  return (
    <ArkRatingGroup.Root
      value={value}
      count={count}
      onValueChange={(details) => {
        onValueChange(details.value)
      }}
      className="flex items-center gap-1"
    >
      <ArkRatingGroup.Control className="flex items-center gap-0.5">
        {stars.map((star) => (
          <ArkRatingGroup.Item
            key={star}
            index={star}
            className="text-ink-600 data-highlighted:text-accent data-[half]:text-brass-600 cursor-pointer text-lg leading-none transition-colors"
          >
            ★
          </ArkRatingGroup.Item>
        ))}
      </ArkRatingGroup.Control>
      <ArkRatingGroup.HiddenInput />
    </ArkRatingGroup.Root>
  )
}
