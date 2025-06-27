import { formatAmount, type FormatAmountOptions } from '../../libs/format-amount';

export function formatLineChartAmount(value: number, options?: FormatAmountOptions): string {
  let type: 'income' | 'expense' | 'transfer' = 'transfer';
  if (value > 0) type = 'income';
  else if (value < 0) type = 'expense';
  return formatAmount(value, { compact: true, ...options, type });
}
