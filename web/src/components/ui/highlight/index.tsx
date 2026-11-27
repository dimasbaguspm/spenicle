import { Highlight as ArkHighlight } from '@ark-ui/react/highlight'

import { Text } from '@/components/ui/text'

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
        className="bg-brass-500/25 text-brass-200 rounded-sm px-0.5"
      />
    </Text>
  )
}
