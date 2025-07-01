import type { PieChartDatum } from '../../../../../components/pie-chart';
import type { Account, SummaryAccountsPeriod } from '../../../../../types/api';

// pie chart color palette matching our design system
const ACCOUNT_COLORS = [
  '#e07a5f', // coral - primary
  '#81b29a', // sage - secondary
  '#6b8fad', // mist info blue
  '#e08a47', // coral harmonized amber
  '#6db285', // sage based green
  '#94a3b8', // slate 400
  '#e06650', // coral family red
  '#f1f5f9', // slate 50
  '#cbd5e1', // slate 300
  '#64748b', // slate 500
];

export interface EnrichedAccountData {
  accountId: number;
  accountName: string;
  iconValue?: string;
  colorValue?: string;
  totalIncome: number;
  totalExpenses: number;
  totalNet: number;
  totalTransactions: number;
  allTimeBalance?: number; // placeholder for future implementation
  startDate?: string;
  endDate?: string;
}

/**
 * Maps account summary data with account metadata for enhanced display
 */
export function mapEnrichedAccountData({
  accountsData,
  accountMap,
}: {
  accountsData: SummaryAccountsPeriod;
  accountMap: Record<number, Account>;
}): EnrichedAccountData[] {
  return (accountsData ?? []).map((account) => {
    const accountObj = accountMap[account.accountId ?? -1];
    const metadata = accountObj?.metadata ?? {};

    return {
      accountId: account.accountId ?? -1,
      accountName: accountObj?.name ?? `Account #${account.accountId}`,
      iconValue: 'icon' in metadata ? metadata.icon : undefined,
      colorValue: 'color' in metadata ? metadata.color : undefined,
      totalIncome: account.totalIncome ?? 0,
      totalExpenses: account.totalExpenses ?? 0,
      totalNet: account.totalNet ?? 0,
      totalTransactions: account.totalTransactions ?? 0,
      startDate: account.startDate,
      endDate: account.endDate,
      // allTimeBalance will be implemented when all-time data is available
      allTimeBalance: 0,
    };
  });
}

/**
 * Prepares pie chart data from account data with percentage calculations
 * Can be based on expenses or income based on chartType
 */
export function mapAccountPieChartData({
  accountData,
  chartType = 'expenses',
}: {
  accountData: EnrichedAccountData[];
  chartType?: 'expenses' | 'income';
}): PieChartDatum[] {
  // calculate total for percentage calculation
  const total = accountData.reduce((sum, account) => {
    return sum + (chartType === 'expenses' ? account.totalExpenses : account.totalIncome);
  }, 0);

  if (total === 0) return [];

  // filter out accounts with zero amounts and sort by usage (highest first)
  const filteredAndSorted = accountData
    .filter((account) => {
      const value = chartType === 'expenses' ? account.totalExpenses : account.totalIncome;
      return value > 0;
    })
    .sort((a, b) => {
      const valueA = chartType === 'expenses' ? a.totalExpenses : a.totalIncome;
      const valueB = chartType === 'expenses' ? b.totalExpenses : b.totalIncome;
      return valueB - valueA; // highest first
    });

  return filteredAndSorted.map((account, index) => {
    const value = chartType === 'expenses' ? account.totalExpenses : account.totalIncome;
    const percentage = (value / total) * 100;

    // ensure we always have a color - prioritize account color, then fallback to palette
    const assignedColor = ACCOUNT_COLORS[index % ACCOUNT_COLORS.length];

    return {
      name: account.accountName,
      value,
      percentage,
      fill: assignedColor,
    };
  });
}
