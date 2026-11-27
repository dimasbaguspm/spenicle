import { Field } from '@ark-ui/react/field'
import type { InputHTMLAttributes } from 'react'

import { control, type ControlSize } from '@/components/primitives/control'
import { cn } from '@/lib/cn'

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'size' | 'type'> & {
  size?: ControlSize
  className?: string
}

/** A native date field: the API speaks `YYYY-MM-DD`, so the widget speaks it too. */
export function DateInput({ size, className, ...rest }: DateInputProps) {
  return <Field.Input type="date" className={cn(control({ size }), className)} {...rest} />
}
