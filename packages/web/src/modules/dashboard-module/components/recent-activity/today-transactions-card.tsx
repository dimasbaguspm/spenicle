import { Calendar, ChevronRight } from 'lucide-react';

import { IconButton, Tile } from '../../../../components';

export interface TodayTransactionsCardProps {
  /**
   * Number of transactions completed today
   */
  transactionCount: number;
  /**
   * Total amount spent today (should be a negative number for expenses)
   */
  totalAmount: number;
  /**
   * Currency symbol to display
   */
  currencySymbol?: string;
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
export function TodayTransactionsCard({
  transactionCount,
  totalAmount,
  currencySymbol = '$',
  onClick,
  className,
}: TodayTransactionsCardProps) {
  // Format the amount with proper sign and currency
  const formatAmount = (amount: number) => {
    const sign = amount < 0 ? '-' : '+';
    const absoluteAmount = Math.abs(amount).toFixed(2);
    return `${sign}${currencySymbol}${absoluteAmount}`;
  };

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
        <p className="text-xs text-slate-500">Total spent today</p>
        <p className="text-md font-bold text-coral-600">{formatAmount(totalAmount)}</p>
      </div>
    </Tile>
  );
}
