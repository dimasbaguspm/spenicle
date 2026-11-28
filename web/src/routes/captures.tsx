import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'

import { buttonStyles } from '@/components/primitives/button'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { cn } from '@/lib/cn'
import { Text } from '@/components/primitives/text'
import { CaptureList } from '@/components/widgets/capture-list'
import { useCaptures } from '@/hooks/queries/use-captures'

export function CapturesPage() {
  const captures = useCaptures({ limit: 20 })
  const rows = useMemo(() => captures.data?.captures ?? [], [captures.data])

  return (
    <div className="space-y-8">
      <header className="max-w-prose space-y-2.5">
        <Text as="p" tone="section">
          Intake
        </Text>
        <Text as="h1" tone="display">
          Captures
        </Text>
        <Text as="p" tone="muted">
          What arrived without being confirmed. Nothing here has touched the ledger yet.
        </Text>
      </header>

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
              A receipt photo, a share sheet, a forwarded mail — it lands here until you decide what
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
            <div className="bg-ink-800/60 h-3 w-1/3 animate-pulse rounded" />
            <div className="bg-ink-800/60 h-3 w-2/3 animate-pulse rounded" />
          </div>
        ) : null}

        {captures.error === null ? null : (
          <Text as="p" tone="caption" className="text-oxblood-300 pt-6" role="alert">
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
