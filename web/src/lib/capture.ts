import { Schema } from 'effect'

/**
 * One schema, two jobs: it is the form's value type and the parse that guards it.
 * The rules mirror the API's own validation tags — a real calendar day, a non-empty
 * amount as a string of minor units, and two refs that must name something.
 */
export const CaptureForm = Schema.Struct({
  amount: Schema.NonEmptyString,
  note: Schema.String,
  occurredOn: Schema.String.pipe(Schema.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/))),
  categoryRef: Schema.NonEmptyString,
  accountRef: Schema.NonEmptyString,
})

export type CaptureValues = typeof CaptureForm.Type

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}
