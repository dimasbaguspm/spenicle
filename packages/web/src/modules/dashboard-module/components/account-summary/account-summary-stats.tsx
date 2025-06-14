export interface AccountSummaryStatsProps {
  /**
   * Total net worth amount
   */
  totalNetWorth: number;
  /**
   * This month's change amount
   */
  thisMonth: number;
  /**
   * This week's change amount
   */
  thisWeek: number;
  /**
   * Currency symbol to display
   */
  currencySymbol?: string;
}

/**
 * AccountSummaryStats displays the summary statistics in a grid layout.
 */
export function AccountSummaryStats({
  totalNetWorth,
  thisMonth,
  thisWeek,
  currencySymbol = '$',
}: AccountSummaryStatsProps) {
  const formatAmount = (amount: number) => {
    const sign = amount < 0 ? '-' : '+';
    const absoluteAmount = (Math.abs(amount) / 1000).toFixed(1);
    return `${sign}${currencySymbol}${absoluteAmount}K`;
  };

  return (
    <div className="grid grid-cols-3 gap-6 text-center">
      <div className="space-y-1">
        <p className="text-2xl font-bold text-sage-600">{formatAmount(totalNetWorth)}</p>
        <p className="text-xs text-slate-500 font-medium">Total Net Worth</p>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-mist-600">{formatAmount(thisMonth)}</p>
        <p className="text-xs text-slate-500 font-medium">This Month</p>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-coral-600">{formatAmount(thisWeek)}</p>
        <p className="text-xs text-slate-500 font-medium">This Week</p>
      </div>
    </div>
  );
}
