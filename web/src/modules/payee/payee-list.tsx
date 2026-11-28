import { Link } from '@tanstack/react-router'

import { Text } from '@/components/primitives/text'

import { payeeCaption, type PayeeRow } from './row'

/** Every payee, one line each: the name, the defaults it fills in, and whether it is retired. */
export function PayeeList({ rows }: { rows: readonly PayeeRow[] }) {
  return (
    <ul className="divide-border divide-y">
      {rows.map((row) => (
        <li key={row.ref}>
          <Link
            to="/payees/$ref"
            params={{ ref: row.ref }}
            className="hover:bg-surface-raised/50 flex items-baseline justify-between gap-4 px-5 py-3.5 transition-colors sm:px-6"
          >
            <span className="min-w-0 space-y-0.5">
              <span className="text-text block truncate text-sm">{row.name}</span>
              <Text as="span" tone="caption" className="text-text-faint block">
                {payeeCaption(row)}
              </Text>
            </span>
            {row.archived ? (
              <Text as="span" tone="section" className="text-text-faint shrink-0">
                archived
              </Text>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
