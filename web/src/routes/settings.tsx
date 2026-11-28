import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useSettings } from '@/hooks/queries/use-settings'
import { useAuth } from '@/providers'
import { SettingsFacts } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const settingsCrumbs = [{ label: 'Settings' }] as const

/**
 * The instance itself, under one index, the way `/manage` indexes what you keep. What the ledger is
 * kept in is read-only here; everything you can change is one row away.
 */
export function SettingsPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const settings = useSettings()

  const sections = [
    {
      to: '/settings/appearance',
      label: 'Appearance',
      caption: 'Light, dark, or whatever this client asks for.',
      count: '',
    },
    {
      to: '/settings/password',
      label: 'Password',
      caption: 'The root credential. Rotating it leaves every token alone.',
      count: '',
    },
    {
      to: '/settings/tokens',
      label: 'API tokens',
      caption: 'Named, scoped credentials for a script or a phone.',
      count: '',
    },
  ] as const

  return (
    <div className="space-y-6">
      <PageHeader items={settingsCrumbs} title="Settings" />

      <Panel className="divide-border divide-y">
        <SettingsFacts settings={settings.data} />
      </Panel>

      <Panel className="divide-border divide-y">
        {sections.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className="hover:bg-surface-raised/50 flex items-center gap-4 px-5 py-4 transition-colors sm:px-6"
          >
            <span className="min-w-0 flex-1 space-y-0.5">
              <Text as="span" tone="body" className="block">
                {section.label}
              </Text>
              <Text as="span" tone="caption" className="text-text-faint block">
                {section.caption}
              </Text>
            </span>
            <Text as="span" tone="figure" className="text-text-muted shrink-0 text-xs">
              {section.count}
            </Text>
            <ArrowRight className="text-text-faint size-4 shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="space-y-0.5">
            <Text as="p" tone="section">
              Session
            </Text>
            <Text as="p" tone="muted" className="text-sm">
              Signing out drops this tab's token. The API tokens keep working.
            </Text>
          </div>
          <Button
            tone="danger"
            size="sm"
            onClick={() => {
              signOut()
              void navigate({ to: '/' })
            }}
          >
            Sign out
          </Button>
        </div>
      </Panel>
    </div>
  )
}
