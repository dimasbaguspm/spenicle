import { Badge, Text } from '@dimasbaguspm/versaur';
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
    <div className="border-b border-border px-4 py-3">
      <div className="flex gap-1 flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Text as="span" fontSize="lg" fontWeight="semibold">
            {displayDate}
          </Text>
          <Badge size="sm" color="neutral">
            {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div
          className={cn(
            'px-2 py-0.5 rounded-lg',
            totalAmount > 0 && 'bg-secondary/10',
            totalAmount < 0 && 'bg-primary/10',
            totalAmount === 0 && 'bg-tertiary/10'
          )}
        >
          <Text
            as="span"
            fontSize="base"
            fontWeight="semibold"
            color={totalAmount > 0 ? 'secondary' : totalAmount < 0 ? 'primary' : 'tertiary'}
          >
            {formatAmount(totalAmount, {
              type: totalAmount > 0 ? 'income' : totalAmount < 0 ? 'expense' : 'transfer',
              compact: true,
              hidePrefix: true,
            })}
          </Text>
        </div>
      </div>
    </div>
  );
};
