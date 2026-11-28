import { buttonStyles } from '@/components/primitives/button'
import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

import type { RecurringRow } from './row'

/**
 * Every rule, one line each, laid out like the register: who it pays, how often, when it is next
 * due and how much. The worker turns a due rule into a capture, so a row steers the schedule and
 * never posts anything itself.
 */
export function RecurringList({
  rows,
  onToggle,
}: {
  rows: readonly RecurringRow[]
  onToggle: (row: RecurringRow) => void
}) {
  return (
    <>
      <div className="text-text-faint border-border hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] tracking-[0.16em] uppercase sm:flex">
        <span className="min-w-0 flex-1">Rule</span>
        <span className="w-28 shrink-0">Next due</span>
        <span className="w-28 shrink-0 text-right">Amount</span>
        <span className="w-32 shrink-0" />
      </div>

      <ul>
        {rows.map((row) => (
          <li
            key={row.ref}
            className="border-border/70 flex items-center gap-3 border-t px-4 py-3 first:border-t-0 sm:grid sm:grid-cols-[minmax(0,1fr)_7rem_7rem_8rem] sm:px-6"
          >
            <span className="min-w-0 flex-1 space-y-0.5">
              <span className="text-text block truncate text-sm">{row.title}</span>
              <Text as="span" tone="caption" className="text-text-faint block">
                {row.schedule}
              </Text>
              <Text as="span" tone="caption" className="text-text-faint block sm:hidden">
                {row.caption}
              </Text>
            </span>

            <Text as="span" tone="figure" className="text-text-muted hidden text-xs sm:block">
              {row.nextDue}
            </Text>

            <Text as="span" tone="figure" className="shrink-0 text-sm">
              {row.amount}
            </Text>

            <span className="flex shrink-0 items-center justify-end gap-2">
              <span
                className={cn(
                  'inline-block rounded-full border border-current px-2 py-0.5 text-[0.6875rem] uppercase',
                  row.tone,
                )}
              >
                {row.state}
              </span>
              <button
                type="button"
                className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
                onClick={() => {
                  onToggle(row)
                }}
              >
                {row.running ? 'Pause' : 'Resume'}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
