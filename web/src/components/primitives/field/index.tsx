import { Field as ArkField } from '@ark-ui/react/field'
import type { ReactNode } from 'react'

import { Text } from '@/components/primitives/text'

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
 * messages. The label is Ark's element with our `Text` inside it (`asChild`), so the
 * association stays Ark's and the type scale stays ours.
 */
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <ArkField.Root invalid={error !== undefined} className="space-y-1.5">
      <ArkField.Label asChild>
        <Text as="label" tone="caption" className="tracking-[0.12em] uppercase">
          {label}
        </Text>
      </ArkField.Label>
      {children}
      {error === undefined ? null : (
        <ArkField.ErrorText asChild>
          <Text as="p" tone="caption" className="text-danger">
            {error}
          </Text>
        </ArkField.ErrorText>
      )}
      {hint === undefined || error !== undefined ? null : (
        <ArkField.HelperText asChild>
          <Text as="p" tone="caption">
            {hint}
          </Text>
        </ArkField.HelperText>
      )}
    </ArkField.Root>
  )
}
