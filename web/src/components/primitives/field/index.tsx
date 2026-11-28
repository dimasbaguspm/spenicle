import { Field as ArkField } from '@ark-ui/react/field'
import type { ReactNode } from 'react'

import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

type FieldProps = {
  label: string
  /** shown under the control, replaced by the error when there is one */
  hint?: string | undefined
  error?: string | undefined
  /** layout only, for a field that spans two columns of a form grid */
  className?: string | undefined
  /** the control: a Ui input, a Ui select — anything Ark's field can describe */
  children: ReactNode
}

/**
 * Ark's field owns the aria wiring: one id for the label, the control and the two
 * messages. The label is Ark's element with our `Text` inside it (`asChild`), so the
 * association stays Ark's and the type scale stays ours. The brass hairline that
 * appears on the label when the field is focused is the only state the label shows.
 */
export function Field({ label, hint, error, className, children }: FieldProps) {
  return (
    <ArkField.Root
      invalid={error !== undefined}
      className={cn('group/field space-y-1.5', className)}
    >
      <ArkField.Label asChild>
        <Text
          as="label"
          tone="caption"
          className="text-text-muted group-focus-within/field:text-accent block text-[0.6875rem] font-medium tracking-[0.14em] uppercase transition-colors"
        >
          {label}
        </Text>
      </ArkField.Label>
      {children}
      {error === undefined ? null : (
        <ArkField.ErrorText asChild>
          <Text as="p" tone="caption" className="text-danger flex items-start gap-1.5">
            {error}
          </Text>
        </ArkField.ErrorText>
      )}
      {hint === undefined || error !== undefined ? null : (
        <ArkField.HelperText asChild>
          <Text as="p" tone="caption" className="text-text-muted leading-relaxed">
            {hint}
          </Text>
        </ArkField.HelperText>
      )}
    </ArkField.Root>
  )
}
