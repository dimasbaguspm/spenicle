import { formatNumberCompact } from './utils';

export interface FormatAmountOptions {
  type?: 'income' | 'expense' | 'transfer';
  compact?: boolean;
  showCurrency?: boolean;
  hidePrefix?: boolean; // Optional: hide the prefix (+, -, ↔)
}

/**
 * Format an amount for display, with optional compact notation and currency symbol.
 * - Adds prefix based on type: +, -, or ↔
 * - Uses compact notation if compact=true
 * - Optionally shows/hides currency symbol
 */
export const formatAmount = (amount: number, options: FormatAmountOptions = {}): string => {
  const { type = 'expense', compact = false, hidePrefix } = options;
  const prefix = type === 'income' ? '+' : type === 'expense' ? '-' : '↔';
  const absAmount = Math.abs(amount);
  const formatted = compact
    ? formatNumberCompact(absAmount)
    : absAmount.toLocaleString('IDR', { minimumFractionDigits: 2 });

  return `${!hidePrefix ? prefix : ''}${formatted}`;
};
