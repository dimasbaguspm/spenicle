import { Editable as ArkEditable } from '@ark-ui/react/editable'

import { control } from '@/components/ui/control'
import { Text } from '@/components/ui/text'

type EditableProps = {
  value: string
  onValueChange: (value: string) => void
  label?: string | undefined
}

/** Ark owns the edit/submit/cancel states and hides the input until editing; the field chrome is ours. */
export function Editable({ value, onValueChange, label }: EditableProps) {
  return (
    <ArkEditable.Root
      value={value}
      onValueChange={(details) => {
        onValueChange(details.value)
      }}
      className="space-y-1.5"
    >
      {label === undefined ? null : (
        <ArkEditable.Label asChild>
          <Text as="label" tone="caption" className="tracking-[0.12em] uppercase">
            {label}
          </Text>
        </ArkEditable.Label>
      )}
      <div className="flex items-start gap-2">
        <ArkEditable.Area className="min-w-0 flex-1">
          <ArkEditable.Input className={control()} />
          <ArkEditable.Preview className="text-text hover:text-accent focus-visible:ring-accent/40 cursor-text rounded px-1 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none" />
        </ArkEditable.Area>
        <ArkEditable.Control className="flex items-center gap-1">
          <ArkEditable.EditTrigger className="text-text-muted hover:text-accent rounded px-1.5 py-1 text-sm transition-colors">
            ✎
          </ArkEditable.EditTrigger>
          <ArkEditable.SubmitTrigger className="text-success rounded px-1.5 py-1 text-sm transition-colors">
            ✓
          </ArkEditable.SubmitTrigger>
          <ArkEditable.CancelTrigger className="text-text-muted hover:text-danger rounded px-1.5 py-1 text-sm transition-colors">
            ✕
          </ArkEditable.CancelTrigger>
        </ArkEditable.Control>
      </div>
    </ArkEditable.Root>
  )
}
