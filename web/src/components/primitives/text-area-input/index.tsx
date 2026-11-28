import { Field } from '@ark-ui/react/field'
import type { TextareaHTMLAttributes } from 'react'

import { control, type ControlSize } from '@/components/primitives/control'
import { cn } from '@/lib/cn'

type TextAreaInputProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  size?: ControlSize
  className?: string
}

export function TextAreaInput({ size, className, rows = 3, ...rest }: TextAreaInputProps) {
  // a textarea sizes itself by its rows: the control's fixed height is for single-line inputs
  return (
    <Field.Textarea
      rows={rows}
      className={cn(control({ size }), 'h-auto min-h-20 resize-y py-2', className)}
      {...rest}
    />
  )
}
