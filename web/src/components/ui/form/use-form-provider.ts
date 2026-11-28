import { useFormContext, type FieldValues, type UseFormReturn } from 'react-hook-form'

/**
 * The one way a field finds its form. A `*Field` component calls this and never takes the
 * form instance as a prop, which is what keeps `<Form>{(form) => }</Form>` readable: the
 * callback is for the submit handler, not for wiring nineteen controllers by hand. Outside a
 * form the provider hands back nothing, and that is a wiring mistake worth failing loudly on.
 */
export function useFormProvider<Schema extends FieldValues>(): UseFormReturn<Schema> {
  const form = useFormContext<Schema>() as UseFormReturn<Schema> | null

  if (form === null) {
    throw new Error('useFormProvider must be used inside <Form> or <DebounceForm>')
  }

  return form
}
