import { debounce } from 'radash'
import { useEffect, useRef, type ReactNode } from 'react'
import {
  FormProvider,
  useForm,
  useWatch,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from 'react-hook-form'

import { cn } from '@/lib/cn'

type DebounceOptions = {
  /** milliseconds of quiet before `onDebounce` runs; radash owns the timer */
  delay: number
}

const defaultOptions: DebounceOptions = { delay: 400 }

type DebounceFormProps<Schema extends FieldValues> = {
  defaultValues: DefaultValues<Schema>
  onDebounce: (values: Schema, form: UseFormReturn<Schema>) => void
  options?: DebounceOptions | undefined
  className?: string | undefined
  children?: ((form: UseFormReturn<Schema>) => ReactNode) | undefined
}

/**
 * The sibling of `Form` for a screen that saves as it types: same provider, no submit
 * button. radash owns the timer (and its cancel), the ref keeps the first render — the
 * default values — from counting as an edit, and a cleanup drops a pending tick instead of
 * firing it against a form that has already unmounted.
 */
export function DebounceForm<Schema extends FieldValues>({
  defaultValues,
  onDebounce,
  options = defaultOptions,
  className,
  children,
}: DebounceFormProps<Schema>) {
  const form = useForm<Schema>({ defaultValues })
  const values = useWatch({ control: form.control }) as Schema
  const { delay } = options
  const latest = useRef({ onDebounce, form })
  const runner = useRef<((next: Schema) => void) & { cancel: () => void }>(null)
  const primed = useRef(false)

  useEffect(() => {
    latest.current = { onDebounce, form }
  }, [onDebounce, form])

  // radash's cancel latches the debouncer into pass-through, so it is created and cancelled
  // once per delay: a pending tick is dropped on the way out, never fired against an
  // unmounted form, and every keystroke inside one delay window shares one timer.
  useEffect(() => {
    const debounced = debounce<[Schema]>({ delay }, (next) => {
      latest.current.onDebounce(next, latest.current.form)
    })

    runner.current = debounced

    return () => {
      debounced.cancel()
      runner.current = null
    }
  }, [delay])

  useEffect(() => {
    if (!primed.current) {
      primed.current = true

      return
    }

    runner.current?.(values)
  }, [values])

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className={cn('space-y-4', className)}
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        {children?.(form)}
      </form>
    </FormProvider>
  )
}
