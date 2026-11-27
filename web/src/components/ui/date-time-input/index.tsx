import { Field } from '@ark-ui/react/field'
import type { InputHTMLAttributes } from 'react'

import { control, type ControlSize } from '@/components/ui/control'
import { cn } from '@/lib/cn'

type DateTimeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'size' | 'type'
> & {
  size?: ControlSize
  className?: string
}

export function DateTimeInput({ size, className, ...rest }: DateTimeInputProps) {
  return (
    <Field.Input type="datetime-local" className={cn(control({ size }), className)} {...rest} />
  )
}
