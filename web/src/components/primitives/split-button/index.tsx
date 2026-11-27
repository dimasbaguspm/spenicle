import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/primitives/button'
import { ButtonGroup } from '@/components/primitives/button-group'
import { Icon } from '@/components/primitives/icon'
import { Menu } from '@/components/primitives/menu'

type SplitButtonItem = {
  label: string
  onSelect: () => void
}

type SplitButtonProps = {
  children: ReactNode
  onClick: () => void
  items: SplitButtonItem[]
  loading?: boolean | undefined
  disabled?: boolean | undefined
  tone?: 'primary' | 'quiet' | 'ghost' | 'danger' | undefined
}

/**
 * One action, and the alternates behind a chevron: the main button does the thing, the square
 * trigger opens the rest. Ark has no split button, so this is our `Button` and `Menu` joined by
 * a `ButtonGroup`, which is what keeps the two halves looking like one control.
 */
export function SplitButton({
  children,
  onClick,
  items,
  loading = false,
  disabled = false,
  tone = 'primary',
}: SplitButtonProps) {
  return (
    <ButtonGroup attached>
      <Button tone={tone} onClick={onClick} loading={loading} disabled={disabled}>
        {children}
      </Button>
      <Menu
        items={items}
        trigger={
          <Button
            tone={tone}
            disabled={disabled}
            aria-label="More actions"
            className="w-9 justify-center px-0"
          >
            <Icon as={ChevronDown} />
          </Button>
        }
      />
    </ButtonGroup>
  )
}
