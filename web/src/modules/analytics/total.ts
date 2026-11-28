import type { CategoryTotal } from '@/api/types'
import { formatMoney, sumMinor, type MoneyScale } from '@/lib/money'

/** The exact total of a category report, as the sentence beside its heading. */
export function categoryTotal(categories: readonly CategoryTotal[], scale: MoneyScale): string {
  return formatMoney(sumMinor(categories.map((row) => row.amount_minor)), scale.units).toDisplay()
}
