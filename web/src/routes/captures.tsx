import { Link } from '@tanstack/react-router'
import { ArrowRight, Plus } from 'lucide-react'
import { useState } from 'react'

import { buttonStyles } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DebounceForm, TextField } from '@/components/ui/form'
import { useCaptures } from '@/hooks/queries/use-captures'
import { cn } from '@/lib/cn'
import { CaptureList } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const captureCrumbs = [{ label: 'Manage', to: '/manage' }, { label: 'Captures' }] as const

/**
 * The inbox: what arrived, in the order it arrived, narrowed by a search that reads the text the
 * intake sent and the ref it stamped. Approving one is the next screen — nothing posts itself.
 */
export function CapturesPage() {
  const [query, setQuery] = useState('')
  const captures = useCaptures({ limit: 100 })

  const needle = query.trim().toLowerCase()
  const rows = (captures.data?.captures ?? []).filter(
    (capture) =>
      needle === '' ||
      capture.ref.includes(needle) ||
      (capture.raw_text ?? '').toLowerCase().includes(needle),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        items={captureCrumbs}
        title="Waiting to be reviewed"
        subtitle="A capture is a file until you say what it was."
        action={
          <Link
            to="/manage/captures/new"
            className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
          >
            <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
            New capture
          </Link>
        }
      />

      <DebounceForm<{ q: string }>
        className="max-w-sm"
        defaultValues={{ q: '' }}
        onDebounce={(values) => {
          setQuery(values.q)
        }}
      >
        {() => <TextField<{ q: string }> name="q" label="Search" placeholder="text or ref" />}
      </DebounceForm>

      {captures.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {captures.error.message}
        </Text>
      )}

      <Panel className="p-5 sm:p-6">
        {rows.length === 0 ? (
          <div className="max-w-prose space-y-2.5">
            <Text as="p" tone="section">
              Capture inbox
            </Text>
            <Text as="h2" tone="title" className="text-2xl">
              {needle === '' ? 'Empty queue' : 'Nothing matches'}
            </Text>
            <Text as="p" tone="muted" className="leading-relaxed">
              {needle === ''
                ? 'A receipt photo, a share sheet, a forwarded mail. It lands here until you decide what it was. Nothing posts itself.'
                : 'No capture carries that text or that ref. Clear the search to see the whole queue.'}
            </Text>
            <div className="pt-3">
              <Link
                to={needle === '' ? '/manage/captures/new' : '/ledger'}
                className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
              >
                {needle === '' ? 'Capture one' : 'Open register'}
                <ArrowRight className="size-3.5" aria-hidden="true" strokeWidth={2} />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <PanelHead
              eyebrow="Capture inbox"
              description="Approving a capture is the next screen; the queue itself is read-only here."
            />
            <div className="pt-4">
              <CaptureList rows={rows} />
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
