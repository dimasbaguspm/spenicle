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
  if (!accountData || accountData.length === 0) {
    return [];
  }

  // calculate total for the selected chart type
  const total = accountData.reduce((sum, account) => {
    return sum + (chartType === 'expenses' ? account.totalExpenses : account.totalIncome);
  }, 0);

  if (total <= 0) {
    return [];
  }

  // filter and map data for pie chart
  return accountData
    .filter((account) => {
      const value = chartType === 'expenses' ? account.totalExpenses : account.totalIncome;
      return value > 0;
    })
    .map((account, index) => {
      const value = chartType === 'expenses' ? account.totalExpenses : account.totalIncome;
      const percentage = (value / total) * 100;

      return {
        name: account.accountName,
        value,
        percentage,
        fill: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
        // additional metadata for tooltips
        metadata: {
          accountId: account.accountId,
          totalIncome: account.totalIncome,
          totalExpenses: account.totalExpenses,
          totalTransactions: account.totalTransactions,
        },
      };
    })
    .sort((a, b) => b.value - a.value); // sort by value descending
}

/**
 * Maps enriched account data for mobile card list display
 */
export function mapAccountCardData({
  accountData,
  accountMap,
}: {
  accountData: EnrichedAccountData[];
  accountMap: Record<number, Account>;
}): Array<{
  account: Account | undefined;
  accountPeriod: EnrichedAccountData;
}> {
  if (!accountData || accountData.length === 0) {
    return [];
  }

  return accountData.map((accountPeriod) => ({
    account: accountMap[accountPeriod.accountId],
    accountPeriod,
  }));
}
