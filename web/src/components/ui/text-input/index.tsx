import { Field } from '@ark-ui/react/field'
import type { InputHTMLAttributes } from 'react'

import { control, type ControlSize } from '@/components/ui/control'
import { cn } from '@/lib/cn'

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size' | 'type'> & {
  size?: ControlSize
  className?: string
}

/** Ark's `Field.Input`, so the id and aria from Ui Field land on the control itself. */
export function TextInput({ size, className, ...rest }: TextInputProps) {
  return <Field.Input type="text" className={cn(control({ size }), className)} {...rest} />
}
