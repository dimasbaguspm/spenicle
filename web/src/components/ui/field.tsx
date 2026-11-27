import { Field as ArkField } from '@ark-ui/react/field'
import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  /** shown under the control, replaced by the error when there is one */
  hint?: string | undefined
  error?: string | undefined
  /** the control: a Ui input, a Ui select — anything Ark's field can describe */
  children: ReactNode
}

/**
 * Ark's field owns the aria wiring: one id for the label, the control and the two
 * messages, so a screen cannot forget the association. We own the type scale.
 */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <ArkField.Root invalid={error !== undefined} className="space-y-1.5">
      <ArkField.Label className="text-text-muted block text-[11px] tracking-[0.12em] uppercase">
        {label}
      </ArkField.Label>
      {children}
      {error === undefined ? null : (
        <ArkField.ErrorText className="text-danger text-xs">{error}</ArkField.ErrorText>
      )}
      {hint === undefined || error !== undefined ? null : (
        <ArkField.HelperText className="text-ink-300 text-xs">{hint}</ArkField.HelperText>
      )}
    </ArkField.Root>
  )
}
