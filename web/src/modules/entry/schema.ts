import { Schema } from 'effect'

import { DateFormat, formatDate } from '@/lib/date'

/**
 * One schema, two jobs: it is the form's value type and the parse that guards it.
 * The rules mirror the API's own validation tags — a real calendar day, a non-empty
 * amount as a string of minor units, and two refs that must name something.
 */
export const EntryForm = Schema.Struct({
  amount: Schema.NonEmptyString,
  note: Schema.String,
  occurredOn: Schema.String.pipe(Schema.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/))),
  categoryRef: Schema.NonEmptyString,
  accountRef: Schema.NonEmptyString,
})

export type EntryFormValues = typeof EntryForm.Type

/** What a form starts as: an empty amount and note, today's day, nothing picked yet. */
export const emptyEntryForm = (day = formatDate(new Date(), DateFormat.Iso)): EntryFormValues => ({
  amount: '',
  note: '',
  occurredOn: day,
  categoryRef: '',
  accountRef: '',
})
