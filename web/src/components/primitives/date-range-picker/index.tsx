import { DateInput } from '@/components/primitives/date-input'
import { Text } from '@/components/primitives/text'

/**
 * Two days read as one answer: `from` to `to`. The plate is the native date input twice, joined by
 * the word between them, so a filter asks "when" once instead of asking for a start and an end as
 * if they were unrelated questions. The two stack, because a native date field refuses to shrink
 * past its own glyphs and a rail is narrower than two of them side by side.
 */
export function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string
  to: string
  onFromChange: (day: string) => void
  onToChange: (day: string) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <DateInput
        value={from}
        aria-label="From"
        onChange={(event) => {
          onFromChange(event.target.value)
        }}
      />

      <div aria-hidden="true" className="flex items-center gap-2">
        <span className="bg-border h-px flex-1" />
        <Text as="span" tone="caption" className="text-text-faint">
          to
        </Text>
        <span className="bg-border h-px flex-1" />
      </div>

      <DateInput
        value={to}
        aria-label="To"
        onChange={(event) => {
          onToChange(event.target.value)
        }}
      />
    </div>
  )
}
