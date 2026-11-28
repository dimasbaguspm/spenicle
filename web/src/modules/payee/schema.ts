import { Schema } from 'effect'
import type { Resolver } from 'react-hook-form'

import type { PayeeCreate } from '@/api/types'

/** An empty string is "no default", which the API takes as the field being absent. */
export const payeeForm = Schema.Struct({
  name: Schema.NonEmptyString,
  accountRef: Schema.String,
  categoryRef: Schema.String,
})

export type PayeeFormValues = typeof payeeForm.Type

export const payeeResolver: Resolver<PayeeFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(payeeForm)(values), errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

export const emptyPayeeForm = { name: '', accountRef: '', categoryRef: '' }

/** The body both create and patch take: a ref the form left empty is simply not sent. */
export function payeeBody(values: PayeeFormValues): PayeeCreate {
  return {
    name: values.name,
    ...(values.accountRef === '' ? {} : { default_account_ref: values.accountRef }),
    ...(values.categoryRef === '' ? {} : { default_category_ref: values.categoryRef }),
  }
}
