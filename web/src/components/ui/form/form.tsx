import type { ReactNode } from 'react'
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form'

import { Button } from '@/components/primitives/button'
import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

type FormProps<Schema extends FieldValues> = {
  defaultValues: DefaultValues<Schema>
  onSubmit: (values: Schema) => void | Promise<void>
  resolver?: Resolver<Schema> | undefined
  onCancel?: (() => void) | undefined
  submitLabel?: string | undefined
  cancelLabel?: string | undefined
  /** replaces the default action row, for a form that submits from somewhere else */
  footer?: ReactNode | undefined
  className?: string | undefined
  /** the form instance is handed over, but the fields do not need it: they read the provider */
  children?: ((form: UseFormReturn<Schema>) => ReactNode) | undefined
}

/**
 * react-hook-form owns the state, the submission and the per-field subscription; this file
 * owns the one `<form>`, the provider that a `*Field` child finds its form through, and the
 * two buttons at the bottom. Rules stay where they belong: a `resolver` (an Effect schema)
 * for the shape, a `Field`'s own `error` for the message a person reads.
 */
export function Form<Schema extends FieldValues>({
  defaultValues,
  onSubmit,
  resolver,
  onCancel,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  footer,
  className,
  children,
}: FormProps<Schema>) {
  const form = useForm<Schema>({ defaultValues, ...(resolver === undefined ? {} : { resolver }) })
  const rootError = form.formState.errors.root?.message

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className={cn('space-y-4', className)}
        onSubmit={(event) => {
          void form.handleSubmit(onSubmit)(event)
        }}
      >
        {children?.(form)}
        {rootError === undefined ? null : (
          <Text as="p" tone="caption" className="text-danger" role="alert">
            {rootError}
          </Text>
        )}
        {footer ?? (
          <div className="border-border flex items-center justify-end gap-2 border-t pt-4">
            {onCancel === undefined ? null : (
              <Button type="button" tone="quiet" onClick={onCancel}>
                {cancelLabel}
              </Button>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : submitLabel}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}
