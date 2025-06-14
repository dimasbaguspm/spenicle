import dayjs from 'dayjs';
import { Calendar, ChevronRight } from 'lucide-react';

import { IconButton, Tile } from '../../../../components';
import { useApiTransactionsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';

export interface TodayTransactionsCardProps {
  /**
   * Click handler for the card navigation
   */
  onClick: () => void;
  /**
   * Additional CSS classes for the tile container
   */
  className?: string;
}

/**
 * TodayTransactionsCard displays today's transaction activity summary.
 * Shows transaction count and total spending with callback for navigation.
 */
export function TodayTransactionsCard({ onClick, className }: TodayTransactionsCardProps) {
  // Get today's date range (start and end of today)
  const todayStart = dayjs().startOf('day').toISOString();
  const todayEnd = dayjs().endOf('day').toISOString();

  // Fetch today's transactions
  const [transactionsData, , { isLoading, isError }] = useApiTransactionsQuery({
    startDate: todayStart,
    endDate: todayEnd,
    pageSize: 1000, // Get all transactions for today
  });

  // Calculate transaction count and total amount from real data
  const transactions = transactionsData?.items ?? [];
  const transactionCount = transactions.length;

  // Calculate total amount (expenses are negative, income is positive)
  const totalAmount = transactions.reduce((sum, transaction) => {
    if (transaction.type === 'expense') {
      return sum - Math.abs(transaction.amount ?? 0);
    } else if (transaction.type === 'income') {
      return sum + Math.abs(transaction.amount ?? 0);
    }
    return sum; // transfers don't affect the total
  }, 0);

  // Show loading state
  if (isLoading) {
    return (
      <Tile className={`p-4 ${className ?? ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-coral-100 rounded-lg">
              <Calendar className="h-4 w-4 text-coral-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Today's Activity</p>
              <p className="text-xs text-slate-500">Loading...</p>
            </div>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="text-coral-600 hover:text-coral-700"
            aria-label="View all transactions"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="flex flex-row justify-between items-center">
          <p className="text-xs text-slate-500">Today's net</p>
          <p className="text-md font-bold text-slate-400">Loading...</p>
        </div>
      </Tile>
    );
  }

  // Show error state
  if (isError) {
    return (
      <Tile className={`p-4 ${className ?? ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-coral-100 rounded-lg">
              <Calendar className="h-4 w-4 text-coral-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Today's Activity</p>
              <p className="text-xs text-slate-500">Error loading data</p>
            </div>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="text-coral-600 hover:text-coral-700"
            aria-label="View all transactions"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="flex flex-row justify-between items-center">
          <p className="text-xs text-slate-500">Today's net</p>
          <p className="text-md font-bold text-slate-400">--</p>
        </div>
      </Tile>
    );
  }

  return (
    <Tile className={`p-4 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-coral-100 rounded-lg">
            <Calendar className="h-4 w-4 text-coral-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Today's Activity</p>
            <p className="text-xs text-slate-500">
              {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <IconButton
          variant="ghost"
          size="sm"
          onClick={onClick}
          className="text-coral-600 hover:text-coral-700"
          aria-label="View all transactions"
        >
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="flex flex-row justify-between items-center">
        <p className="text-xs text-slate-500">Today's net</p>
        <p
          className={`text-md font-bold ${
            totalAmount > 0 ? 'text-sage-600' : totalAmount < 0 ? 'text-coral-600' : 'text-mist-600'
          }`}
        >
          {formatAmount(totalAmount, {
            type: totalAmount < 0 ? 'expense' : totalAmount > 0 ? 'income' : 'expense',
            compact: true,
          })}
        </p>
      </div>
    </Tile>
  );
}
