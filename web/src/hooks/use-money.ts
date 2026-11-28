import { formatMoney } from '@/lib/money'
import { useMeta } from '@/hooks/queries/use-meta'

/** One reading of the base currency: its code, its minor units, and a formatter that respects both. */
export function useMoney() {
  const meta = useMeta()
  const currency = meta.data?.settings.base_currency ?? 'USD'
  const units = meta.data?.currencies.find((row) => row.code === currency)?.minor_units ?? 2

  return {
    currency,
    units,
    figure: (minor: string) => formatMoney(minor, units, currency, false),
  }
}
