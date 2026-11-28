import { Link } from '@tanstack/react-router'

import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

import type { RuleRow } from './row'

/**
 * Every rule, oldest first: the pattern the text has to hold, where it is looked for, and the
 * category it answers with. Archived rules stay in the list, dimmed, because the reason a rule was
 * retired is worth as much as the rule.
 */
export function RuleList({ rows }: { rows: readonly RuleRow[] }) {
  return (
    <>
      <div className="text-text-faint border-border hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] tracking-[0.16em] uppercase sm:flex">
        <span className="min-w-0 flex-1">Pattern</span>
        <span className="w-40 shrink-0">Matches</span>
        <span className="w-40 shrink-0">Category</span>
        <span className="w-24 shrink-0" />
      </div>

      <ul>
        {rows.map((row) => (
          <li key={row.ref} className="border-border/70 border-t first:border-t-0">
            <Link
              to="/manage/rules/$ref"
              params={{ ref: row.ref }}
              className="hover:bg-surface-raised/60 flex items-center gap-3 px-4 py-3 text-sm transition-colors sm:grid sm:grid-cols-[minmax(0,1fr)_10rem_10rem_3rem] sm:px-6"
            >
              <span className="min-w-0 flex-1 space-y-0.5">
                <span
                  className={cn(
                    'block truncate font-mono',
                    row.archived ? 'text-text-faint' : 'text-text',
                  )}
                >
                  {row.pattern}
                </span>
                <Text as="span" tone="caption" className="text-text-faint block sm:hidden">
                  {row.matches} - {row.category}
                </Text>
              </span>

              <Text as="span" tone="caption" className="text-text-muted hidden sm:block">
                {row.matches}
              </Text>

              <Text as="span" tone="caption" className="text-text-muted hidden sm:block">
                {row.category}
              </Text>

              <span className="flex shrink-0 items-center justify-end">
                {row.archived ? (
                  <Text as="span" tone="caption" className="text-text-faint">
                    archived
                  </Text>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
