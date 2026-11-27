import type { InputHTMLAttributes } from 'react'

type HiddenInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className' | 'style' | 'placeholder'
> & {
  name: string
}

/**
 * Ark ships `*.HiddenInput` only as a widget's internal node (slider, pin input, select), never
 * stand-alone, so this is the native `<input type="hidden">` and nothing else.
 */
export function HiddenInput({ name, ...rest }: HiddenInputProps) {
  return <input type="hidden" name={name} {...rest} />
}
