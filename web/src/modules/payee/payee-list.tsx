import { Link } from '@tanstack/react-router'

import { Text } from '@/components/primitives/text'

import { payeeCaption, type PayeeRow } from './row'

/**
 * Every payee, one row each, laid out like the register: a column strip, the same grid, the same
 * hover. The name is the subject, the defaults are the detail, and a retired name says so.
 */
export function PayeeList({ rows }: { rows: readonly PayeeRow[] }) {
  return (
    <>
      <div className="text-text-faint border-border hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] tracking-[0.16em] uppercase sm:flex">
        <span className="min-w-0 flex-1">Payee</span>
        <span className="w-32 shrink-0 text-right">Status</span>
      </div>

      <ul>
        {rows.map((row) => (
          <li key={row.ref} className="border-border/70 border-t first:border-t-0">
            <Link
              to="/manage/payees/$ref"
              params={{ ref: row.ref }}
              className="hover:bg-surface-raised/60 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 text-sm transition-colors sm:grid-cols-[minmax(0,1fr)_8rem] sm:px-6"
            >
              <span className="min-w-0 space-y-0.5">
                <span className="text-text block truncate">{row.name}</span>
                <Text as="span" tone="caption" className="text-text-faint block">
                  {payeeCaption(row)}
                </Text>
              </span>
              <span className="justify-self-end">
                {row.archived ? (
                  <span className="text-text-muted border-border inline-block rounded-full border px-2 py-0.5 text-[0.6875rem]">
                    archived
                  </span>
                ) : (
                  <Text as="span" tone="caption" className="text-text-faint">
                    active
                  </Text>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
