import { NavigationMenu as ArkNavigationMenu } from '@ark-ui/react/navigation-menu'

import { cn } from '@/lib/cn'

type NavGroup = {
  label: string
  href?: string | undefined
  /** a group with links opens a panel; a group without one is a plain link */
  links?: { label: string; href: string }[] | undefined
}

type NavigationMenuProps = {
  items: NavGroup[]
}

const link = 'text-text-muted hover:text-porcelain-50 rounded px-2 py-1 text-sm transition-colors'

/**
 * Ark owns the delay-group logic, the hover and focus bridge to the panel, and the aria for
 * both: this is the one menu that must not close when the pointer crosses the gap. We own the
 * paper and the brass underline.
 */
export function NavigationMenu({ items }: NavigationMenuProps) {
  return (
    <ArkNavigationMenu.Root className="min-w-0">
      <ArkNavigationMenu.List className="flex items-center gap-1">
        {items.map((item) =>
          item.links === undefined ? (
            <li key={item.label}>
              <a href={item.href ?? '#'} className={link}>
                {item.label}
              </a>
            </li>
          ) : (
            <ArkNavigationMenu.Item key={item.label} value={item.label}>
              <ArkNavigationMenu.Trigger className={cn(link, 'data-[state=open]:text-accent')}>
                {item.label}
              </ArkNavigationMenu.Trigger>
              <ArkNavigationMenu.Content className="border-border-strong bg-surface-raised shadow-ink-950/60 w-56 rounded border p-1 shadow-xl">
                <ul className="space-y-0.5">
                  {item.links.map((entry) => (
                    <li key={entry.href}>
                      <a href={entry.href} className={cn(link, 'block')}>
                        {entry.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </ArkNavigationMenu.Content>
            </ArkNavigationMenu.Item>
          ),
        )}
      </ArkNavigationMenu.List>
      <ArkNavigationMenu.Viewport />
    </ArkNavigationMenu.Root>
  )
}
