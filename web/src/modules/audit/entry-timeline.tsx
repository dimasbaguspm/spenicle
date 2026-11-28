import { Link } from '@tanstack/react-router'

import { Text } from '@/components/primitives/text'

import type { TimelineRow } from './row'

/**
 * One row's life, newest first: a dot and the thing that happened on the left, who and when on
 * the right, and a way through to the other entry when the line is a reversal.
 */
export function EntryTimeline({ rows }: { rows: readonly TimelineRow[] }) {
  if (rows.length === 0) {
    return (
      <Text as="p" tone="muted" className="p-5 sm:p-6">
        No history yet.
      </Text>
    )
  }

  return (
    <ol className="p-5 sm:p-6">
      {rows.map((row, index) => (
        <li key={row.ref} className="relative flex gap-3 pb-4 last:pb-0">
          <span className="relative flex w-2 shrink-0 justify-center">
            <span className="bg-accent absolute top-1.5 size-1.5 rounded-full" aria-hidden="true" />
            {index === rows.length - 1 ? null : (
              <span className="bg-border absolute top-3.5 bottom-[-1rem] w-px" aria-hidden="true" />
            )}
          </span>

          <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
            <span className="min-w-0 space-y-0.5">
              <Text as="span" tone="body" className="block">
                {row.label}
              </Text>
              {row.detail === undefined ? null : row.related === undefined ? (
                <Text as="span" tone="code" className="text-text-muted block">
                  {row.detail}
                </Text>
              ) : (
                <Link
                  to="/ledger/$ref"
                  params={{ ref: row.related }}
                  className="text-text-muted hover:text-accent block font-mono text-[0.8125rem] tracking-tight underline-offset-4 hover:underline"
                >
                  {row.detail}
                </Link>
              )}
            </span>

            <span className="text-text-faint shrink-0 text-right text-xs">
              {row.actor}
              <span className="block font-mono tabular-nums">{row.when}</span>
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}
