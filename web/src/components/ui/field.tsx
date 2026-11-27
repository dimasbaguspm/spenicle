import { Children, cloneElement, useId, type ReactElement, type ReactNode } from 'react'

type FieldProps = {
  label: string
  /** shown under the control, replaced by the error when there is one */
  hint?: string
  error?: string | undefined
  /** exactly one control: a Ui input, a Ui select, anything that takes id + aria */
  children: ReactNode
}

type ControlProps = {
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

/**
 * Label, hint and error are wired to the control by id, so a screen cannot forget
 * the association. No headless library: this is a label and two spans, and React's
 * own `useId` is the only state it needs.
 */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId()
  const describedBy =
    error === undefined ? (hint === undefined ? undefined : `${id}-hint`) : `${id}-error`

  const control = cloneElement(Children.only(children) as ReactElement<ControlProps>, {
    id,
    ...(describedBy === undefined ? {} : { 'aria-describedby': describedBy }),
    ...(error === undefined ? {} : { 'aria-invalid': true }),
  })

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-text-muted block text-[11px] tracking-[0.12em] uppercase">
        {label}
      </label>
      {control}
      {error === undefined ? null : (
        <p id={`${id}-error`} role="alert" className="text-danger text-xs">
          {error}
        </p>
      )}
      {hint === undefined || error !== undefined ? null : (
        <p id={`${id}-hint`} className="text-ink-300 text-xs">
          {hint}
        </p>
      )}
    </div>
  )
}
