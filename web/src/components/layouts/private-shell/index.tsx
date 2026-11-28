import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  ChartLine,
  LayoutDashboard,
  LogOut,
  Minus,
  Plus,
  Settings as SettingsIcon,
  Wallet,
} from 'lucide-react'

import { Brand } from '@/components/layouts/brand'
import { buttonStyles, Button } from '@/components/primitives/button'
import { Menu } from '@/components/primitives/menu'
import { Text } from '@/components/primitives/text'
import { useAuth } from '@/providers'
import { queryClient } from '@/api/query'
import { cn } from '@/lib/cn'

/** The five screens the desk nav carries; everything else is one click from the bar below. */
const deskSections = [
  { to: '/ledger', label: 'Register' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/categories', label: 'Categories' },
  { to: '/payees', label: 'Payees' },
  { to: '/analytics', label: 'Analytics' },
] as const

/** The thumb bar: five slots, the register in the middle, the menu on the end. */
const thumbSections = [
  { to: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', Icon: Wallet },
  { to: '/analytics', label: 'Analytics', Icon: ChartLine },
] as const

type ThumbSection = (typeof thumbSections)[number]

const shellWidth = 'mx-auto w-full max-w-[96rem] px-4 sm:px-8'

const tab = 'relative shrink-0 py-3 text-sm text-text-faint transition-colors hover:text-text'

const activeTab =
  'text-text after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-accent'

const thumbItem = 'flex items-center justify-center py-4'

/**
 * The signed-in shell. From `lg` a header carries the three working sections and the two actions;
 * below `lg` there is no header at all, and a five-slot thumb bar does the same work.
 */
export function PrivateShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <DeskHeader />

      <main
        id="content"
        className={`${shellWidth} flex flex-1 flex-col py-6 pb-24 sm:py-8 lg:pb-10`}
      >
        <Outlet />
      </main>

      <footer className="border-border/60 hidden border-t lg:block">
        <div className={`${shellWidth} py-5`}>
          <Text as="span" tone="caption" className="text-text-faint">
            Self-hosted. One household. No telemetry.
          </Text>
        </div>
      </footer>

      <ThumbBar />
    </div>
  )
}

function DeskHeader() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const leave = () => {
    signOut()
    queryClient.clear()
    void navigate({ to: '/' })
  }

  return (
    <header className="border-border bg-surface-sunken/90 sticky top-0 z-30 hidden border-b backdrop-blur-sm lg:block">
      <div className={`${shellWidth} flex h-14 items-center gap-6`}>
        <Link to="/ledger" className="shrink-0 rounded focus-visible:outline-offset-4">
          <Brand size="sm" />
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-6" aria-label="Sections">
          {deskSections.map((section) => (
            <Link
              key={section.to}
              to={section.to}
              className={tab}
              activeProps={{ className: activeTab }}
            >
              {section.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/settings"
            className={cn(buttonStyles({ tone: 'ghost', size: 'sm' }), 'px-2')}
            aria-label="Settings"
            title="Settings"
          >
            <SettingsIcon className="size-4" aria-hidden="true" strokeWidth={1.75} />
          </Link>
          <Button
            tone="ghost"
            size="sm"
            className="px-2"
            aria-label="Log out"
            title="Log out"
            onClick={leave}
          >
            <LogOut className="size-4" aria-hidden="true" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </header>
  )
}

function ThumbBar() {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const active = (to: string) => path === to || (to === '/ledger' && path.startsWith('/ledger'))

  return (
    <nav
      aria-label="Sections"
      className="border-border bg-surface-sunken/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      <div className="grid grid-cols-5 items-center">
        <ThumbLink {...thumbSections[0]} active={active(thumbSections[0].to)} />
        <ThumbLink {...thumbSections[1]} active={active(thumbSections[1].to)} />
        <Link
          to="/ledger/new"
          search={{ mode: 'manual' }}
          aria-label="Add entry"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-[0_8px_20px_-10px_rgba(0,0,0,0.9)] transition-colors hover:bg-primary-hover"
        >
          <Plus className="size-5" aria-hidden="true" strokeWidth={2} />
        </Link>
        <ThumbLink {...thumbSections[2]} active={active(thumbSections[2].to)} />
        <div className="flex items-center justify-center">
          <Menu
            align="end"
            items={[
              { label: 'Captures', onSelect: () => void navigate({ to: '/captures' }) },
              { label: 'Categories', onSelect: () => void navigate({ to: '/categories' }) },
              { label: 'Payees', onSelect: () => void navigate({ to: '/payees' }) },
              { label: 'Exports', onSelect: () => void navigate({ to: '/exports' }) },
              { label: 'Settings', onSelect: () => void navigate({ to: '/settings' }) },
              {
                label: 'Sign out',
                onSelect: () => {
                  signOut()
                  queryClient.clear()
                  void navigate({ to: '/' })
                },
              },
            ]}
            trigger={
              <button
                type="button"
                aria-label="More"
                className="text-text-faint hover:text-text flex h-14 w-full items-center justify-center transition-colors"
              >
                <Minus className="size-5" aria-hidden="true" strokeWidth={2} />
              </button>
            }
          />
        </div>
      </div>
    </nav>
  )
}

function ThumbLink({ to, label, Icon, active }: ThumbSection & { active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(thumbItem, active ? 'text-accent' : 'text-text-faint hover:text-text')}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="size-5" aria-hidden="true" strokeWidth={1.75} />
    </Link>
  )
}
