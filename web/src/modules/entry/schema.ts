import { Schema } from 'effect'

import { DateFormat, formatDate } from '@/lib/date'
import type { Resolver } from 'react-hook-form'

/**
 * One schema, two jobs: it is the form's value type and the parse that guards it.
 * The rules mirror the API's own validation tags — a real calendar day, a non-empty
 * amount as a string of minor units, and the refs that must name something. A payee is
 * the one optional ref: an entry may be nobody's.
 */
export const EntryForm = Schema.Struct({
  amount: Schema.NonEmptyString,
  note: Schema.String,
  occurredOn: Schema.String.pipe(Schema.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/))),
  categoryRef: Schema.NonEmptyString,
  accountRef: Schema.NonEmptyString,
  payeeRef: Schema.String,
})

export type EntryFormValues = typeof EntryForm.Type

/** What a form starts as: an empty amount and note, today's day, nothing picked yet. */
export const emptyEntryForm = (
  day = formatDate(new Date(), DateFormat.Iso),
  first: { accountRef?: string | undefined; categoryRef?: string | undefined } = {},
): EntryFormValues => ({
  amount: '',
  note: '',
  occurredOn: day,
  categoryRef: first.categoryRef ?? '',
  accountRef: first.accountRef ?? '',
  payeeRef: '',
})

export const entryResolver: Resolver<EntryFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(EntryForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}
