import { debounce } from 'radash'
import { useEffect, useRef, type ReactNode } from 'react'
import { FormProvider, useForm, type DefaultValues, type FieldValues } from 'react-hook-form'

import { Button } from '@/components/primitives/button'
import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

type QueryFormProps<Schema extends FieldValues> = {
  /** the filter as the URL currently carries it; the draft starts here */
  values: Schema
  /** called with the draft: on every change when `live`, on submit when not */
  onApply: (values: Schema) => void
  onClear?: (() => void) | undefined
  /** a rail applies as it changes; a sheet waits for its Apply */
  live?: boolean
  /** drops empty fields, so the URL never carries `?from=` */
  normalize?: ((values: Schema) => Schema) | undefined
  submitLabel?: string | undefined
  className?: string | undefined
  /** milliseconds of quiet before a live form writes; typing a date should cost one request */
  delay?: number | undefined
  children: ReactNode
}

/**
 * A form whose value is a query, not a record: the same provider and the same `*Field` bindings
 * as `Form`, but no submission contract to the API. A live one (the desktop rail) writes each
 * change straight to the URL; a staged one (the phone's sheet) keeps a draft until Apply.
 *
 * The parent keys this by the URL, so a filter that changes from the outside remounts a fresh
 * draft instead of fighting an effect.
 */
export function QueryForm<Schema extends FieldValues>({
  values,
  onApply,
  onClear,
  live = false,
  normalize,
  submitLabel = 'Apply',
  className,
  delay = 300,
  children,
}: QueryFormProps<Schema>) {
  const form = useForm<Schema>({ defaultValues: values as DefaultValues<Schema> })
  const apply = useRef(onApply)
  const tidy = useRef(normalize)
  const queue = useRef<((next: Schema) => void) | null>(null)

  // the subscription below is opened once; the refs keep it pointing at the current callbacks
  useEffect(() => {
    apply.current = onApply
    tidy.current = normalize
  }, [onApply, normalize])

  // a live form types as fast as a person: the write waits for the pause, and a remount (the
  // parent keys this by the URL) cancels the pending tick instead of firing it twice
  useEffect(() => {
    if (!live) {
      return
    }

    const write = debounce<[Schema]>({ delay }, (next) => {
      apply.current(next)
    })

    queue.current = write

    return () => {
      write.cancel()
      queue.current = null
    }
  }, [live, delay])

  useEffect(() => {
    if (!live) {
      return
    }

    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values: draft }) => {
        const next = draft as Schema
        const tidyNext = tidy.current === undefined ? next : tidy.current(next)

        if (queue.current === null) {
          apply.current(tidyNext)
        } else {
          queue.current(tidyNext)
        }
      },
    })

    return unsubscribe
  }, [form, live])

  return (
    <FormProvider {...form}>
      <form
        noValidate
        className={cn('space-y-4', className)}
        onSubmit={(event) => {
          event.preventDefault()
          const draft = form.getValues()
          onApply(normalize === undefined ? draft : normalize(draft))
        }}
      >
        {children}

        {live ? (
          onClear === undefined ? null : (
            <Button type="button" tone="ghost" size="sm" block onClick={onClear}>
              Clear
            </Button>
          )
        ) : (
          <div className="flex items-center gap-2">
            {onClear === undefined ? null : (
              <Button type="button" tone="quiet" size="md" onClick={onClear}>
                Clear
              </Button>
            )}
            <Button type="submit" size="md" block>
              {submitLabel}
            </Button>
          </div>
        )}

        <Text as="p" tone="caption" className="sr-only">
          Filters are kept in the address, so this view can be shared.
        </Text>
      </form>
    </FormProvider>
  )
}
