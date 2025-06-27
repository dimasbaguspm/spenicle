import { formatAmount } from '../../../../libs/format-amount';

export interface AccountSummaryStatsProps {
  /**
   * Total net worth amount (actual account balances)
   */
  totalNetWorth: number;
  /**
   * This month's net change amount (income - expenses)
   */
  thisMonth: number;
  /**
   * This week's net change amount (income - expenses)
   */
  thisWeek: number;
}

/**
 * AccountSummaryStats displays the summary statistics in a grid layout.
 */
export function AccountSummaryStats({ totalNetWorth, thisMonth, thisWeek }: AccountSummaryStatsProps) {
  const getAmountColor = (amount: number) => {
    if (amount > 0) return 'text-sage-600'; // Positive - sage
    if (amount < 0) return 'text-coral-600'; // Negative - coral
    return 'text-mist-600'; // Neutral/zero - mist
  };

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-6">
      <div className="space-y-1 text-center">
        <p
          className={`text-lg sm:text-xl lg:text-2xl font-bold ${getAmountColor(totalNetWorth)} tabular-nums leading-tight`}
        >
          {formatAmount(totalNetWorth, {
            type: totalNetWorth >= 0 ? 'income' : 'expense',
            compact: true,
          })}
        </p>
        <p className="text-xs text-slate-500 font-medium">Total Net Worth</p>
      </div>
      <div className="space-y-1 text-center">
        <p
          className={`text-lg sm:text-xl lg:text-2xl font-bold ${getAmountColor(thisMonth)} tabular-nums leading-tight`}
        >
          {formatAmount(thisMonth, {
            type: thisMonth >= 0 ? 'income' : 'expense',
            compact: true,
          })}
        </p>
        <p className="text-xs text-slate-500 font-medium">This Month</p>
      </div>
      <div className="space-y-1 text-center">
        <p
          className={`text-lg sm:text-xl lg:text-2xl font-bold ${getAmountColor(thisWeek)} tabular-nums leading-tight`}
        >
          {formatAmount(thisWeek, {
            type: thisWeek >= 0 ? 'income' : 'expense',
            compact: true,
          })}
        </p>
        <p className="text-xs text-slate-500 font-medium">This Week</p>
      </div>
    </div>
  );
}
