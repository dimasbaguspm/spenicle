import { Dayjs } from 'dayjs';

import { formatAmount } from '../../../../libs/format-amount';
import { cn } from '../../../../libs/utils';

export interface TransactionHeaderProps {
  date: Dayjs;
  totalAmount: number;
  transactionCount: number;
}

export const TransactionHeader = ({ date, totalAmount, transactionCount }: TransactionHeaderProps) => {
  const displayDate = date.toDate().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="border-b border-mist-100 px-4 py-3">
      <div className="flex gap-1 flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-slate-700">{displayDate}</span>
          <span
            className="ml-2 bg-mist-100 text-slate-700 rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide"
            aria-label={`${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}`}
          >
            {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
          </span>
        </div>
        <span
          className={cn(
            'text-md md:text-base font-semibold px-2 py-0.5 rounded-lg',
            totalAmount > 0
              ? 'bg-success-50 text-success-700'
              : totalAmount < 0
                ? 'bg-danger-50 text-danger-700'
                : 'bg-mist-50 text-info-700',
            'tracking-tight'
          )}
          aria-label={`Total for ${displayDate}: ${formatAmount(totalAmount, { type: totalAmount > 0 ? 'income' : totalAmount < 0 ? 'expense' : 'transfer', compact: true })}`}
        >
          {formatAmount(totalAmount, {
            type: totalAmount > 0 ? 'income' : totalAmount < 0 ? 'expense' : 'transfer',
            compact: true,
          })}
        </span>
      </div>
    </div>
  );
};
