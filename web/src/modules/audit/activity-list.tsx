import { Link } from '@tanstack/react-router'

import { Text } from '@/components/primitives/text'

import type { ActivityRow } from './activity'

/**
 * The whole journal in one list, newest first: when, who, what, and a link to the thing itself.
 * Nothing is grouped and nothing is hidden — an operator reading this is looking for one line.
 */
export function ActivityList({ rows }: { rows: readonly ActivityRow[] }) {
  return (
    <>
      <div className="text-text-faint border-border hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] tracking-[0.16em] uppercase sm:flex">
        <span className="w-36 shrink-0">When</span>
        <span className="min-w-0 flex-1">What</span>
        <span className="w-24 shrink-0 text-right">Who</span>
      </div>

      <ul>
        {rows.map((row) => (
          <li
            key={row.ref}
            className="border-border/70 flex items-baseline gap-3 border-t px-4 py-3 text-sm first:border-t-0 sm:grid sm:grid-cols-[9rem_minmax(0,1fr)_6rem] sm:px-6"
          >
            <Text as="span" tone="figure" className="text-text-faint hidden text-xs sm:block">
              {row.when}
            </Text>

            <span className="min-w-0 space-y-0.5">
              <span className="text-text block truncate">
                {row.action} a {row.entity}
              </span>
              <span className="block">
                {row.to === undefined || row.targetRef === undefined ? (
                  row.plainTo === undefined ? (
                    <Text as="span" tone="code" className="text-text-faint">
                      {row.targetRef ?? 'the instance'}
                    </Text>
                  ) : (
                    <Link
                      to={row.plainTo}
                      className="text-text-muted hover:text-accent font-mono text-[0.8125rem] underline-offset-4 hover:underline"
                    >
                      {row.plainTo}
                    </Link>
                  )
                ) : (
                  <Link
                    to={row.to}
                    params={{ ref: row.targetRef }}
                    className="text-text-muted hover:text-accent font-mono text-[0.8125rem] underline-offset-4 hover:underline"
                  >
                    {row.targetRef.slice(0, 8)}
                  </Link>
                )}
              </span>
              <Text as="span" tone="caption" className="text-text-faint block sm:hidden">
                {row.when}
              </Text>
            </span>

            <Text as="span" tone="caption" className="text-text-muted shrink-0 text-right">
              {row.actor}
            </Text>
          </li>
        ))}
      </ul>
    </>
  )
}
