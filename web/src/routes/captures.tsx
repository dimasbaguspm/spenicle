import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { buttonStyles } from '@/components/primitives/button'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { PageHeader } from '@/components/primitives/page-header'
import { Text } from '@/components/primitives/text'
import { useCaptures } from '@/hooks/queries/use-captures'
import { cn } from '@/lib/cn'
import { CaptureList } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const captureCrumbs = [{ label: 'Captures' }] as const

export function CapturesPage() {
  const captures = useCaptures({ limit: 20 })
  const rows = captures.data?.captures ?? []

  return (
    <div className="space-y-8">
      <PageHeader items={captureCrumbs} title="Captures" />

      <Panel className={rows.length === 0 ? 'p-6 sm:p-8' : 'p-5 sm:p-6'}>
        {rows.length === 0 ? (
          <div className="max-w-prose space-y-2.5">
            <Text as="p" tone="section">
              Capture inbox
            </Text>
            <Text as="h2" tone="title" className="text-2xl">
              Empty queue
            </Text>
            <Text as="p" tone="muted" className="leading-relaxed">
              A receipt photo, a share sheet, a forwarded mail. It lands here until you decide what
              it was. Nothing posts itself.
            </Text>
            <div className="pt-3">
              <Link to="/ledger" className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}>
                Open register
                <ArrowRight className="size-3.5" aria-hidden="true" strokeWidth={2} />
              </Link>
            </div>
          </div>
        ) : (
          <PanelHead
            eyebrow="Capture inbox"
            description="Approving a capture is the next screen; the queue itself is read-only here."
          />
        )}

        {captures.isPending ? (
          <div className="space-y-3 pt-6" aria-hidden="true">
            <div className="bg-surface-raised/60 h-3 w-1/3 animate-pulse rounded" />
            <div className="bg-surface-raised/60 h-3 w-2/3 animate-pulse rounded" />
          </div>
        ) : null}

        {captures.error === null ? null : (
          <Text as="p" tone="caption" className="text-danger pt-6" role="alert">
            {captures.error.message}
          </Text>
        )}

        {rows.length === 0 ? null : (
          <div className="pt-4">
            <CaptureList rows={rows} />
          </div>
        )}
      </Panel>
    </div>
  )
}
