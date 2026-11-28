import { Text } from '@/components/primitives/text'

import type { EntryRow } from './row'

/** The signed figure of one row: a minus is money out, a jade plus is money in. */
export function EntryAmount({ row, className }: { row: EntryRow; className: string }) {
  return (
    <Text
      as="span"
      tone="figure"
      className={`${className} ${row.outgoing ? 'text-text' : 'text-success'}`}
    >
      {row.outgoing ? '-' : '+'}
      {row.amount}
    </Text>
  )
}
