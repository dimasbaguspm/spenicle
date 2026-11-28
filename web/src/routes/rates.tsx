import { Schema } from 'effect'
import { type Resolver } from 'react-hook-form'

import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DateField, Form, SelectField } from '@/components/ui/form'
import { useMeta } from '@/hooks/queries/use-meta'
import { useRate } from '@/hooks/queries/use-rates'
import { DateFormat, formatDate } from '@/lib/date'

const RateForm = Schema.Struct({
  base: Schema.NonEmptyString,
  quote: Schema.NonEmptyString,
  on: Schema.String,
})

type RateFormValues = typeof RateForm.Type

const resolver: Resolver<RateFormValues> = (values) => {
  try {
    return { values: Schema.decodeUnknownSync(RateForm)(values), error: {}, errors: {} }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'the form is not valid'

    return { values: {}, errors: { root: { type: 'validate', message } } }
  }
}

/**
 * What one currency is worth in another on a given day. The ledger never converts by magic: an
 * entry carries its own rate, and this screen is how you find the number to type into it.
 */
export function RatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader items={[{ label: 'Manage', to: '/manage' }, { label: 'Rates' }]} title="Rates" />
      <RatesLookup />
    </div>
  )
}

function RatesLookup() {
  const meta = useMeta()

  const currencies = meta.data?.currencies ?? []
  const options = currencies.map((currency) => ({
    label: `${currency.code} (${currency.symbol})`,
    value: currency.code,
  }))

  return (
    <Panel>
      <div className="p-5 sm:p-6">
        <PanelHead
          eyebrow="Look up"
          description="The ECB publishes EUR rates, so a lookup starts there; a day with no sheet falls back to the nearest earlier one."
        />

        <Form<RateFormValues>
          className="mt-4"
          defaultValues={{
            base: 'EUR',
            quote: 'USD',
            on: '',
          }}
          resolver={resolver}
          onSubmit={() => {
            // the lookup is live: the result reads the watched values, so Enter changes nothing
          }}
          footer={false}
        >
          {(form) => (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField<RateFormValues>
                  name="base"
                  label="From"
                  options={options}
                  placeholder="pick a currency…"
                />
                <SelectField<RateFormValues>
                  name="quote"
                  label="To"
                  options={options}
                  placeholder="pick a currency…"
                />
              </div>
              <DateField<RateFormValues>
                name="on"
                label="Day"
                hint="Optional. Empty prices today, in the instance timezone."
              />
              <Result base={form.watch('base')} quote={form.watch('quote')} on={form.watch('on')} />
            </>
          )}
        </Form>
      </div>
    </Panel>
  )
}

function Result({ base, quote, on }: { base: string; quote: string; on: string }) {
  const rate = useRate(base, quote, on)

  if (rate.error !== null) {
    return (
      <Text as="p" tone="caption" className="text-danger" role="alert">
        {rate.error.message}
      </Text>
    )
  }

  if (rate.data === undefined) {
    return (
      <Text as="p" tone="caption" className="text-text-faint">
        {rate.isFetching ? 'Pricing…' : 'Pick two currencies.'}
      </Text>
    )
  }

  const data = rate.data

  return (
    <div className="border-border space-y-3 border-t pt-4">
      <div className="flex items-baseline justify-between gap-4">
        <Text as="p" tone="section">
          {data.base} to {data.quote}
        </Text>
        <Text as="p" tone="figure" className="text-xl">
          {data.rate}
        </Text>
      </div>
      <div className="text-text-faint flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-xs">
        <span>
          Sheet of {formatDate(data.on_date, DateFormat.Iso)}, from {data.source}
        </span>
        <span>Fetched {formatDate(data.fetched_at, DateFormat.Timestamp)}</span>
      </div>
      <Text as="p" tone="caption" className="text-text-faint">
        One {data.base} buys {data.rate} {data.quote}.
      </Text>
    </div>
  )
}
