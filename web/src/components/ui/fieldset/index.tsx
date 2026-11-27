import { Fieldset as ArkFieldset } from '@ark-ui/react/fieldset'
import type { ReactNode } from 'react'

import { Text } from '@/components/ui/text'

type FieldsetProps = {
  legend: string
  children: ReactNode
  disabled?: boolean | undefined
  error?: string | undefined
}

/** Ark owns the group's ids, the invalid flag and the native disabled propagation; the frame is ours. */
export function Fieldset({ legend, children, disabled, error }: FieldsetProps) {
  return (
    <ArkFieldset.Root
      disabled={disabled}
      invalid={error !== undefined}
      className="border-border min-w-0 space-y-3 rounded border p-4"
    >
      <ArkFieldset.Legend className="px-1">
        <Text as="span" tone="section">
          {legend}
        </Text>
      </ArkFieldset.Legend>
      <div className="space-y-3">{children}</div>
      {error === undefined ? null : (
        <ArkFieldset.ErrorText className="block">
          <Text as="p" tone="caption" className="text-danger">
            {error}
          </Text>
        </ArkFieldset.ErrorText>
      )}
    </ArkFieldset.Root>
  )
}
