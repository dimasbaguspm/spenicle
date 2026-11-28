import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useEntityAudit } from '@/hooks/queries/use-audit'
import { EntryTimeline, timelineRows } from '@/modules'

/**
 * One row's journal, as a panel. Account, category, payee and entry all speak the same words, so
 * the screen passes a kind and a ref and this file does the rest.
 */
export function EntityHistory({ kind, ref: entityRef }: { kind: string; ref: string }) {
  const audit = useEntityAudit(kind, entityRef)

  return (
    <Panel>
      <div className="border-border border-b px-5 py-4 sm:px-6">
        <Text as="p" tone="section">
          History
        </Text>
      </div>
      <EntryTimeline rows={timelineRows(audit.data?.audit ?? [])} />
    </Panel>
  )
}
