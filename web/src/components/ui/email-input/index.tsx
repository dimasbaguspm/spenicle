import { Field } from '@ark-ui/react/field'
import type { InputHTMLAttributes } from 'react'

import { control, type ControlSize } from '@/components/ui/control'
import { cn } from '@/lib/cn'

type EmailInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'size' | 'type'
> & {
  size?: ControlSize
  className?: string
}

export function EmailInput({ size, className, ...rest }: EmailInputProps) {
  return (
    <Field.Input
      type="email"
      inputMode="email"
      autoComplete="email"
      className={cn(control({ size }), className)}
      {...rest}
    />
  )
}
