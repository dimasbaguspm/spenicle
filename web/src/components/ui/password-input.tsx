import { PasswordInput as ArkPasswordInput } from '@ark-ui/react/password-input'
import type { ComponentPropsWithoutRef } from 'react'

import { control, type ControlSize } from '@/components/ui/control'
import { cn } from '@/lib/cn'

type PasswordInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'size'> & {
  size?: ControlSize
}

/**
 * Ark owns the visibility toggle, its aria and the `type` swap; the input itself stays a
 * native controlled `<input>`, so a form library can pass `value`, `onChange` and `ref`.
 */
export function PasswordInput({ size, className, ...rest }: PasswordInputProps) {
  return (
    <ArkPasswordInput.Root className="w-full">
      <ArkPasswordInput.Control className="relative">
        <ArkPasswordInput.Input className={cn(control({ size }), 'pr-12', className)} {...rest} />
        <ArkPasswordInput.VisibilityTrigger className="text-text-muted hover:text-accent absolute inset-y-0 right-2 my-auto text-xs">
          <ArkPasswordInput.Indicator fallback="show">hide</ArkPasswordInput.Indicator>
        </ArkPasswordInput.VisibilityTrigger>
      </ArkPasswordInput.Control>
    </ArkPasswordInput.Root>
  )
}
