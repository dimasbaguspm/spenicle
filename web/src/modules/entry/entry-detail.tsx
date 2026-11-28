import type { Entry } from '@/api/types'
import { Link } from '@tanstack/react-router'

import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DateFormat, formatDate } from '@/lib/date'
import { formatMoney, type MoneyScale } from '@/lib/money'
import { absent } from '@/lib/text'
import { accountName, isCategoryKind, isMoneyKind, type AccountIndex } from '@/modules/account'

import { entryRow } from './row'

/** One posting of an entry: which account, whether that account holds money or classifies it. */
/** One end of a correction chain: the entry this row replaced, or the one that replaced it. */
function Chain({ label, target }: { label: string; target: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-text-faint text-xs">{label}</dt>
      <dd className="text-xs">
        <Link
          to="/ledger/$ref"
          params={{ ref: target }}
          className="text-text-muted hover:text-accent font-mono underline-offset-4 hover:underline"
        >
          {target.slice(0, 8)}
        </Link>
      </dd>
    </div>
  )
}

function postingLine(
  posting: Entry['postings'][number],
  accounts: AccountIndex,
  scale: MoneyScale,
) {
  const account = accounts.get(posting.account_ref)
  const kind = account?.kind ?? ''
  const amount = formatMoney(posting.amount_minor, scale.units)
  const role = isMoneyKind(kind) ? 'money' : isCategoryKind(kind) ? 'category' : kind

  return {
    ref: posting.account_ref,
    name: accountName(account),
    kind: kind === '' ? absent : kind,
    role,
    to: isMoneyKind(kind)
      ? ('/manage/accounts/$ref' as const)
      : isCategoryKind(kind)
        ? ('/manage/categories/$ref' as const)
        : undefined,
    amount: amount.toDisplay(),
    outgoing: amount.isNegative(),
    fx:
      posting.fx_rate === undefined
        ? undefined
        : `at ${posting.fx_rate}${posting.fx_source === undefined ? '' : ` (${posting.fx_source})`}`,
  }
}

/**
 * One entry, whole: the postings on both sides, what each account is, and the metadata a row has
 * no room for. It reads an account from a category by the `kind` chip, not by a colour alone.
 */
export function EntryDetail({
  entry,
  accounts,
  scale,
}: {
  entry: Entry
  accounts: AccountIndex
  scale: MoneyScale
  onEditNote?: ((ref: string, note: string) => void) | undefined
}) {
  const row = entryRow(entry, accounts, scale)
  const postings = (entry.postings ?? []).map((posting) => postingLine(posting, accounts, scale))

  return (
    <div className="space-y-6">
      <Panel>
        <div className="space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <Text as="p" tone="section">
                {row.day}
              </Text>
              <Text as="h1" tone="display">
                <span className="text-text block truncate">{row.title}</span>
              </Text>
            </div>
            <div className="flex items-baseline gap-2">
              <Text
                as="p"
                tone="figure"
                className={`text-2xl ${row.outgoing ? '' : 'text-success'}`}
              >
                {row.outgoing ? '-' : '+'}
                {row.amount}
              </Text>
              <Text as="p" tone="caption" className="text-text-faint">
                {scale.currency}
              </Text>
            </div>
            {row.isReversed ? (
              <Text as="p" tone="caption" className="text-danger">
                reversed
              </Text>
            ) : null}
          </div>
        </div>

        <dl className="border-border grid gap-y-2 border-t px-5 py-4 text-sm sm:px-6">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-text-faint text-xs">Day</dt>
            <dd className="text-text font-mono text-xs">
              {formatDate(entry.occurred_on, DateFormat.Iso)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-text-faint text-xs">Payee</dt>
            <dd className="text-text truncate text-xs">
              {entry.payee === undefined ? (
                absent
              ) : (
                <Link
                  to="/manage/payees/$ref"
                  params={{ ref: entry.payee.ref }}
                  className="hover:text-accent underline-offset-4 hover:underline"
                >
                  {entry.payee.name}
                </Link>
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-text-faint text-xs">Source</dt>
            <dd className="text-text truncate text-xs">
              {entry.source === undefined ? absent : entry.source}
            </dd>
          </div>
          {typeof entry.reversal_of_ref === 'string' && entry.reversal_of_ref !== '' ? (
            <Chain label="Replaces" target={entry.reversal_of_ref} />
          ) : null}
          {typeof entry.reversed_by_ref === 'string' && entry.reversed_by_ref !== '' ? (
            <Chain label="Replaced by" target={entry.reversed_by_ref} />
          ) : null}
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-text-faint text-xs">Ref</dt>
            <dd className="text-text-muted font-mono text-[0.6875rem] break-all">{entry.ref}</dd>
          </div>
        </dl>
      </Panel>

      <Panel>
        <div className="p-5 pb-3 sm:p-6 sm:pb-3">
          <PanelHead
            eyebrow="Postings"
            description={`Both sides of the entry, in ${scale.currency}.`}
          />
        </div>
        <div className="text-text-faint border-border flex items-center gap-3 border-t px-5 py-2 text-[0.5625rem] tracking-[0.16em] uppercase sm:px-6">
          <span className="min-w-0 flex-1">Account</span>
          <span>Kind</span>
          <span className="w-32 shrink-0 text-right">Amount</span>
        </div>
        <ul>
          {postings.map((posting) => (
            <li
              key={posting.ref}
              className="border-border/70 flex items-center gap-3 border-t px-5 py-3 text-sm sm:px-6"
            >
              <span className="text-text min-w-0 flex-1 truncate">
                {posting.to === undefined ? (
                  posting.name
                ) : (
                  <Link
                    to={posting.to}
                    params={{ ref: posting.ref }}
                    className="hover:text-accent underline-offset-4 hover:underline"
                  >
                    {posting.name}
                  </Link>
                )}
                {posting.fx === undefined ? null : (
                  <Text as="span" tone="caption" className="text-text-faint block">
                    {posting.fx}
                  </Text>
                )}
              </span>
              <span className="text-text-faint border-border rounded border px-1.5 py-0.5 text-[0.625rem] tracking-wide uppercase">
                {posting.kind}
              </span>
              <Text
                as="span"
                tone="figure"
                className={`w-32 shrink-0 text-right ${posting.outgoing ? 'text-text-muted' : 'text-success'}`}
              >
                {posting.amount}
              </Text>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
