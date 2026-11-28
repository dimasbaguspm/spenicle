import { ThemeToggle } from '@/components/layouts/theme-toggle'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const crumbs = [{ label: 'Settings', to: '/settings' }, { label: 'Appearance' }] as const

export function AppearancePage() {
  return (
    <div className="space-y-6">
      <PageHeader items={crumbs} title="Light or dark" subtitle="The theme this browser uses." />

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="max-w-prose space-y-1">
            <Text as="p" tone="section">
              Theme
            </Text>
            <Text as="p" tone="muted" className="text-sm">
              Light, dark, or whatever this client asks for. The choice is kept in this browser, not
              in the ledger, so a phone and a desk can disagree.
            </Text>
          </div>
          <ThemeToggle />
        </div>
      </Panel>
    </div>
  )
}
