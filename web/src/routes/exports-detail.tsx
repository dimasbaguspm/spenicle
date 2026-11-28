import { useParams } from '@tanstack/react-router'

import { downloadExport } from '@/api/exports'
import { Button } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useExport, useExportEvents } from '@/hooks/queries/use-exports'
import { DateFormat, formatDate } from '@/lib/date'
import { saveBlob } from '@/lib/download'
import { absent } from '@/lib/text'

/**
 * One job: what was asked for, how far the worker got, and the file when there is one. The events
 * are the same log the API keeps — queued, started, completed, downloaded — so a stale job is
 * readable instead of mysterious.
 */
export function ExportDetailPage() {
  const { ref } = useParams({ from: '/manage/exports/$ref' })
  const job = useExport(ref)
  const events = useExportEvents(ref)

  const data = job.data
  const ready = data?.status === 'ready'

  return (
    <div className="space-y-6">
      <PageHeader
        items={[
          { label: 'Manage', to: '/manage' },
          { label: 'Exports', to: '/manage/exports' },
        ]}
        title={data === undefined ? 'Export' : `${data.format?.toUpperCase() ?? ''} export`}
        subtitle="How far the worker got, and the file when there is one."
      />

      {job.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {job.error.message}
        </Text>
      )}

      <Panel>
        <div className="space-y-3 p-5 sm:p-6">
          <PanelHead eyebrow="Job" description="Rendered by the worker, kept for a month." />

          <dl className="border-border grid gap-y-2 border-t pt-3 text-sm">
            <Fact label="Status" value={data?.status ?? absent} />
            <Fact label="Format" value={data?.format ?? absent} />
            <Fact label="Window" value={`${data?.from ?? 'the start'} to ${data?.to ?? 'today'}`} />
            <Fact label="Queued" value={formatDate(data?.created_at, DateFormat.Timestamp)} />
            <Fact label="Started" value={formatDate(data?.started_at, DateFormat.Timestamp)} />
            <Fact label="Finished" value={formatDate(data?.finished_at, DateFormat.Timestamp)} />
            <Fact label="Expires" value={formatDate(data?.expires_at, DateFormat.Timestamp)} />
            <Fact
              label="Schema"
              value={data?.schema_version === undefined ? absent : String(data.schema_version)}
            />
            <Fact label="Ref" value={ref} mono />
          </dl>

          {data?.error_message === undefined ? null : (
            <Text as="p" tone="caption" className="text-danger" role="alert">
              {data.error_message}
            </Text>
          )}

          <div className="flex justify-end">
            <Button
              tone="quiet"
              size="sm"
              disabled={!ready}
              onClick={() => {
                void (async () => {
                  const blob = await downloadExport(ref)

                  saveBlob(blob, `spenicle-${ref}.${data?.format ?? 'json'}`)
                })()
              }}
            >
              Download
            </Button>
          </div>
        </div>
      </Panel>

      {events.data === undefined || events.data.events.length === 0 ? null : (
        <Panel>
          <div className="space-y-3 p-5 sm:p-6">
            <PanelHead eyebrow="Events" />
            <ul className="divide-border divide-y">
              {events.data.events.map((event) => (
                <li
                  key={event.ref}
                  className="flex items-baseline justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="text-text">{event.kind}</span>
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

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-text-faint text-xs">{label}</dt>
      <dd className={mono === true ? 'text-text font-mono text-xs' : 'text-text truncate text-xs'}>
        {value}
      </dd>
    </div>
  )
}
