import { Link } from '@tanstack/react-router'

import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

import { batchRow, type BatchLike } from './row'

/** Every statement this instance has seen, newest first, with what it is and where it stands. */
export function ImportList({ batches }: { batches: readonly BatchLike[] }) {
  return (
    <>
      <div className="text-text-faint border-border hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] tracking-[0.16em] uppercase sm:flex">
        <span className="min-w-0 flex-1">Statement</span>
        <span className="w-24 shrink-0 text-right">Status</span>
      </div>

      <ul>
        {batches.map((batch) => {
          const row = batchRow(batch)

          return (
            <li key={row.ref} className="border-border/70 border-t first:border-t-0">
              <Link
                to="/manage/imports/$ref"
                params={{ ref: row.ref }}
                className="hover:bg-surface-raised/60 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 text-sm transition-colors sm:grid-cols-[minmax(0,1fr)_6rem] sm:px-6"
              >
                <span className="min-w-0 space-y-0.5">
                  <span className="text-text block truncate">{row.title}</span>
                  <Text as="span" tone="caption" className="text-text-faint block">
                    {row.caption}
                  </Text>
                </span>
                <span className="justify-self-end">
                  <span
                    className={cn(
                      'inline-block rounded-full border border-current px-2 py-0.5 text-[0.6875rem] uppercase',
                      row.tone,
                    )}
                  >
                    {row.status}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
