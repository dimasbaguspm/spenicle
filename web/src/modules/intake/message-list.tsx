import { Link } from '@tanstack/react-router'

import { buttonStyles } from '@/components/primitives/button'
import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

import { messageRow, type MessageLike } from './row'

/**
 * What the mailbox produced, newest first: one line per mail reference, the capture it became, and
 * the one action a person has here, which is asking the provider for that mail again.
 */
export function MessageList({
  messages,
  onRefresh,
}: {
  messages: readonly MessageLike[]
  onRefresh: (ref: string) => void
}) {
  return (
    <>
      <div className="text-text-faint border-border hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] tracking-[0.16em] uppercase sm:flex">
        <span className="min-w-0 flex-1">Mail</span>
        <span className="w-24 shrink-0 text-right">Status</span>
        <span className="w-40 shrink-0" />
      </div>

      <ul>
        {messages.map((message) => {
          const row = messageRow(message)

          return (
            <li
              key={row.ref}
              className="border-border/70 flex items-center gap-3 border-t px-4 py-3 text-sm first:border-t-0 sm:px-6"
            >
              <span className="min-w-0 flex-1 space-y-0.5">
                <span className="text-text block truncate">{row.when}</span>
                <Text as="span" tone="caption" className="text-text-faint block">
                  {row.detail}
                </Text>
              </span>

              <span
                className={cn(
                  'inline-block shrink-0 rounded-full border border-current px-2 py-0.5 text-[0.6875rem] uppercase',
                  row.tone,
                )}
              >
                {row.status}
              </span>

              <span className="flex w-40 shrink-0 items-center justify-end gap-2">
                {row.captureRef === undefined ? null : (
                  <Link
                    to="/manage/captures/$ref"
                    params={{ ref: row.captureRef }}
                    className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
                  >
                    Capture
                  </Link>
                )}
                <button
                  type="button"
                  className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
                  onClick={() => {
                    onRefresh(row.ref)
                  }}
                >
                  Re-read
                </button>
              </span>
            </li>
          )
        })}
      </ul>
    </>
  )
}
