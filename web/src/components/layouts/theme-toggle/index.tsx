import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/primitives/button'
import { useTheme, type ThemeChoice } from '@/providers/theme-provider'

const options: { choice: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { choice: 'light', label: 'Light', Icon: Sun },
  { choice: 'dark', label: 'Dark', Icon: Moon },
  { choice: 'system', label: 'Match the client', Icon: Monitor },
]

/**
 * The theme control: three states, because "follow the client" is a decision a person can make
 * and un-make. The pressed one is the current choice, and the icon says which theme is on screen.
 */
export function ThemeToggle() {
  const { choice, setTheme } = useTheme()

  return (
    <fieldset className="border-border m-0 flex items-center gap-0.5 rounded-md border p-0.5">
      <legend className="sr-only">Theme</legend>
      {options.map(({ choice: option, label, Icon }) => {
        const active = choice === option

        return (
          <Button
            key={option}
            tone={active ? 'quiet' : 'ghost'}
            size="sm"
            className={`h-7 w-7 px-0 ${active ? 'border-border-strong text-text' : 'text-text-faint'}`}
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => {
              setTheme(option)
            }}
          >
            <Icon className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
          </Button>
        )
      })}
    </fieldset>
  )
}
