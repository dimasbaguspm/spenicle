import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { BookOpen, ChartLine, Layers, LogOut, Plus, Settings as SettingsIcon } from 'lucide-react'

import { Brand } from '@/components/layouts/brand'
import { ShellFooter } from '@/components/layouts/footer'
import { buttonStyles, Button } from '@/components/primitives/button'
import { useAuth } from '@/providers'
import { queryClient } from '@/api/query'
import { cn } from '@/lib/cn'

/** The three screens the desk nav carries; everything else is one click from Manage. */
const deskSections = [
  { to: '/ledger', label: 'Register' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/manage', label: 'Manage' },
] as const

/** The thumb bar: five slots, the register in the middle, settings on the end. */
const thumbSections = [
  { to: '/ledger', label: 'Register', Icon: BookOpen, prefix: true },
  { to: '/analytics', label: 'Analytics', Icon: ChartLine, prefix: false },
  { to: '/manage', label: 'Manage', Icon: Layers, prefix: true },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon, prefix: false },
] as const

type ThumbSection = (typeof thumbSections)[number]

const shellWidth = 'mx-auto w-full max-w-[96rem] px-4 sm:px-8'

const tab = 'relative shrink-0 py-3 text-sm text-text-faint transition-colors hover:text-text'

const activeTab =
  'text-text after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-accent'

const thumbItem = 'flex items-center justify-center py-4'

/**
 * The signed-in shell. From `lg` a header carries the working sections and the two actions;
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

      <ShellFooter className="hidden lg:block" />

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
        <Link to="/dashboard" className="shrink-0 rounded focus-visible:outline-offset-4">
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

  const active = (section: ThumbSection) =>
    section.prefix ? path === section.to || path.startsWith(`${section.to}/`) : path === section.to

  return (
    <nav
      aria-label="Sections"
      className="border-border bg-surface-sunken/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
    >
      <div className="grid grid-cols-5 items-center">
        <ThumbLink {...thumbSections[0]} active={active(thumbSections[0])} />
        <ThumbLink {...thumbSections[1]} active={active(thumbSections[1])} />
        <Link
          to="/ledger/new"
          search={{ mode: 'manual' }}
          aria-label="Add entry"
          className="bg-primary text-on-primary hover:bg-primary-hover mx-auto flex size-12 items-center justify-center rounded-full shadow-[0_8px_20px_-10px_rgba(0,0,0,0.9)] transition-colors"
        >
          <Plus className="size-5" aria-hidden="true" strokeWidth={2} />
        </Link>
        <ThumbLink {...thumbSections[2]} active={active(thumbSections[2])} />
        <ThumbLink {...thumbSections[3]} active={active(thumbSections[3])} />
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
