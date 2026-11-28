import { useParams } from '@tanstack/react-router'

import { Button } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import {
  useImport,
  useImportEvents,
  usePatchImportRow,
  useReviewImport,
} from '@/hooks/queries/use-imports'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { DateFormat, formatDate } from '@/lib/date'
import { absent } from '@/lib/text'
import { StatementTable, statementRow } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const trail = [
  { label: 'Manage', to: '/manage' },
  { label: 'Imports', to: '/manage/imports' },
] as const

/**
 * One statement as a draft you can overrule: every row is accepted or skipped on its own, and the
 * batch is closed once, by the commit that posts the accepted rows or by the reject that keeps the
 * evidence and posts nothing.
 */
export function ImportReviewPage() {
  const { ref } = useParams({ from: '/manage/imports/$ref' })
  const batch = useImport(ref)
  const events = useImportEvents(ref, { limit: 50 })
  const meta = useMeta()
  const money = useMoney()
  const review = useReviewImport()
  const patch = usePatchImportRow()

  const detail = batch.data
  const rows = (detail?.rows ?? []).map((row) =>
    statementRow(row, meta.data?.accounts ?? [], meta.data?.payees ?? [], money.scale),
  )

  if (batch.error !== null) {
    return (
      <div className="space-y-6">
        <PageHeader items={trail} title="Statement" />
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted" role="alert">
              {batch.error.message}
            </Text>
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        items={[...trail, { label: detail?.filename ?? 'statement' }]}
        title={detail?.filename ?? 'Statement'}
      />

      <Panel>
        <div className="p-5 sm:p-6">
          <PanelHead
            eyebrow={detail?.status === 'draft' ? 'Draft' : 'Statement'}
            description={
              detail?.status === 'draft'
                ? 'Accept what belongs in the ledger, skip the rest, then commit. Nothing posts until you do.'
                : 'Closed. The rows, the file and the events are kept, and nothing here posts again.'
            }
          />

          <dl className="text-text-muted mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <Fact label="Status" value={detail?.status ?? absent} />
            <Fact
              label="Rows"
              value={detail?.rows_total === undefined ? absent : String(detail.rows_total)}
            />
            <Fact label="Currency" value={detail?.currency ?? absent} />
            <Fact
              label="Closed"
              value={
                detail?.committed_at === undefined
                  ? detail?.rejected_at === undefined
                    ? absent
                    : `rejected ${formatDate(detail.rejected_at, DateFormat.Timestamp)}`
                  : `committed ${formatDate(detail.committed_at, DateFormat.Timestamp)}`
              }
            />
            <Fact label="Expires" value={formatDate(detail?.expires_at, DateFormat.Iso)} />
          </dl>

          {detail === undefined ? (
            <Text as="p" tone="muted" className="mt-4">
              Loading the rows
            </Text>
          ) : null}

          {detail === undefined ||
          (detail.status !== 'draft' && detail.status !== 'committing') ? null : (
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <Button
                tone="quiet"
                loading={review.isPending}
                onClick={() => {
                  review.mutate({ ref, body: { action: 'reject' } })
                }}
              >
                Discard
              </Button>
              <Button
                loading={review.isPending}
                onClick={() => {
                  review.mutate({ ref, body: { action: 'commit' } })
                }}
              >
                Commit accepted rows
              </Button>
            </div>
          )}

          {review.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
              {review.error.message}
            </Text>
          )}
          {patch.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger pt-3" role="alert">
              {patch.error.message}
            </Text>
          )}
        </div>
      </Panel>

      {batch.isPending ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              Loading
            </Text>
          </div>
        </Panel>
      ) : (
        <Panel>
          <StatementTable
            rows={rows}
            open={detail?.status === 'draft'}
            onToggle={(row) => {
              patch.mutate({
                ref,
                index: row.index,
                body: { status: row.status === 'accepted' ? 'skipped' : 'accepted' },
              })
            }}
          />
        </Panel>
      )}

      {events.data === undefined || events.data.events.length === 0 ? null : (
        <Panel>
          <div className="p-5 sm:p-6">
            <PanelHead eyebrow="Events" />
            <ul className="divide-border mt-3 divide-y">
              {events.data.events.map((event) => (
                <li
                  key={event.ref}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="text-text">
                    {event.kind}
                    {event.row_index === undefined ? '' : ` row ${String(event.row_index)}`}
                  </span>
                  <Text as="span" tone="caption" className="text-text-faint">
                    {event.actor} - {formatDate(event.at, DateFormat.Timestamp)}
                  </Text>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-text-faint text-[0.5625rem] tracking-[0.16em] uppercase">{label}</dt>
      <dd className="text-text font-mono text-xs">{value}</dd>
    </div>
  )
}
