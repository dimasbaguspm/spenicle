import { Highlight as ArkHighlight } from '@ark-ui/react/highlight'

import { Text } from '@/components/primitives/text'

type HighlightProps = {
  text: string
  query: string
}

/** Ark owns the chunking and the case rules; the brass tint on the matched mark is ours. */
export function Highlight({ text, query }: HighlightProps) {
  return (
    <Text as="span" tone="body">
      <ArkHighlight
        text={text}
        query={query}
        matchAll
        className="bg-accent/25 text-accent rounded-sm px-0.5"
      />
    </Text>
  )
}
