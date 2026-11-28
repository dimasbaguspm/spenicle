import { useMeta } from '@/hooks/queries/use-meta'
import { formatMoney, type Minor, type MoneyScale } from '@/lib/money'

/**
 * One reading of the base currency: its code, its minor units, and the chain every figure on a
 * screen comes from. A screen passes `scale` down and never re-derives the decimals itself.
 */
export function useMoney() {
  const meta = useMeta()
  const currency = meta.data?.settings.base_currency ?? 'USD'
  const units = meta.data?.currencies.find((row) => row.code === currency)?.minor_units ?? 2
  const scale: MoneyScale = { currency, units }

  return {
    scale,
    /** one amount, at this instance's scale */
    amount: (minor: Minor) => formatMoney(minor, scale.units),
    /** one amount as a figure, without the code — a column carries that in its heading */
    figure: (minor: Minor) => formatMoney(minor, scale.units).toDisplay(),
  }
}
