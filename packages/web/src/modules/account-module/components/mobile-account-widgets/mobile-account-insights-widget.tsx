import { Tile, Tabs, Text, type TileProps, type TextProps, Icon, type IconProps } from '@dimasbaguspm/versaur';
import dayjs from 'dayjs';
import { TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';
import { useMemo, type FC } from 'react';

import { useApiSummaryAccountsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';
import type { Account } from '../../../../types/api';

interface MobileAccountInsight {
  label: string;
  value: string;
  trend?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

export type PeriodType = 'today' | 'week' | 'month';

interface MobileAccountInsightsWidgetProps {
  accounts: Account[];
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
}

/**
 * MobileAccountInsightsWidget displays essential financial metrics in a mobile-optimized layout.
 * Shows total accounts, combined balance, and current period income/expenses with period selection.
 */
export const MobileAccountInsightsWidget: FC<MobileAccountInsightsWidgetProps> = ({
  accounts,
  selectedPeriod,
  onPeriodChange,
}) => {
  const now = dayjs();

  // calculate date ranges for different periods
  const { startDate, endDate } = useMemo(() => {
    switch (selectedPeriod) {
      case 'today':
        return {
          startDate: now.startOf('day').toISOString(),
          endDate: now.endOf('day').toISOString(),
        };
      case 'week':
        return {
          startDate: now.startOf('week').toISOString(),
          endDate: now.endOf('week').toISOString(),
        };
      case 'month':
      default:
        return {
          startDate: now.startOf('month').toISOString(),
          endDate: now.endOf('month').toISOString(),
        };
    }
  }, [selectedPeriod, now]);

  const [currentPeriodSummary, , state] = useApiSummaryAccountsQuery({
    startDate,
    endDate,
  });

  // calculate essential financial insights
  const insights = useMemo((): MobileAccountInsight[] => {
    // calculate total balance across all accounts
    const totalBalance = accounts.reduce((sum, account) => sum + (account.amount ?? 0), 0);

    // current period financial totals
    const currentPeriodIncome = (currentPeriodSummary ?? []).reduce(
      (sum: number, summary) => sum + (summary.totalIncome ?? 0),
      0
    );
    const currentPeriodExpenses = (currentPeriodSummary ?? []).reduce(
      (sum: number, summary) => sum + (summary.totalExpenses ?? 0),
      0
    );
    const currentPeriodTransactions = (currentPeriodSummary ?? []).reduce(
      (sum: number, summary) => sum + (summary.totalTransactions ?? 0),
      0
    );

    return [
      {
        label: 'Total Balance (All Time)',
        value: formatAmount(totalBalance, { compact: true, hidePrefix: totalBalance >= 0 }),
        trend: totalBalance >= 0 ? 'positive' : 'negative',
        icon: Wallet,
        iconColor: totalBalance >= 0 ? 'secondary' : 'primary',
      },
      {
        label: `Income`,
        value: formatAmount(currentPeriodIncome, {
          compact: true,
          hidePrefix: true,
        }),
        trend: currentPeriodIncome > 0 ? 'positive' : 'neutral',
        icon: TrendingUp,
        iconColor: 'secondary',
      },
      {
        label: `Expenses`,
        value: formatAmount(currentPeriodExpenses, {
          compact: true,
          hidePrefix: true,
        }),
        trend: currentPeriodExpenses > 0 ? 'negative' : 'neutral',
        icon: TrendingDown,
        iconColor: 'primary',
      },
      {
        label: `Transactions`,
        value: currentPeriodTransactions.toString(),
        trend: currentPeriodTransactions > 0 ? 'neutral' : 'neutral',
        icon: Activity,
        iconColor: 'tertiary',
      },
    ];
  }, [accounts, currentPeriodSummary]);

  // show skeleton loader while data is loading
  if (state.isLoading && !currentPeriodSummary) {
    return <InsightsSkeletonLoader />;
  }

  return (
    <Tile>
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <Text as="h3" fontSize="lg" fontWeight="semibold">
              Overview
            </Text>
            <Text as="p" fontSize="sm">
              Key metrics with period selection
            </Text>
          </div>

          <Tabs value={selectedPeriod} onValueChange={(value) => onPeriodChange(value as PeriodType)}>
            <Tabs.Trigger value="today">Today</Tabs.Trigger>
            <Tabs.Trigger value="week">This Week</Tabs.Trigger>
            <Tabs.Trigger value="month">This Month</Tabs.Trigger>
          </Tabs>
        </div>

        {/* mobile-optimized 2x2 grid with smart visual indicators */}
        <div className="grid grid-cols-2 gap-3">
          {insights.map((insight, index) => {
            const tileVariant: TileProps['variant'] = (() => {
              switch (insight.trend) {
                case 'positive':
                  return 'secondary';
                case 'negative':
                  return 'primary';
                case 'neutral':
                default:
                  return 'tertiary';
              }
            })();

            const textColor: TextProps['color'] = (() => {
              switch (insight.trend) {
                case 'positive':
                  return 'secondary';
                case 'negative':
                  return 'primary';
                case 'neutral':
                default:
                  return 'tertiary';
              }
            })();

            return (
              <Tile variant={tileVariant} key={index}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Text as="p" fontWeight="bold" fontSize="lg" color={textColor}>
                      {insight.value}
                    </Text>
                    <Icon as={insight.icon} size="sm" color={insight.iconColor as IconProps['color']} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{insight.label}</p>
                </div>
              </Tile>
            );
          })}
        </div>
      </div>
    </Tile>
  );
};

/**
 * Smart skeleton loading state for insights widget
 */
const InsightsSkeletonLoader: FC = () => (
  <Tile className="p-4">
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-40 bg-slate-100 rounded animate-pulse" />
        </div>

        {/* period selector skeleton */}
        <div className="w-full h-10 bg-slate-100 rounded-lg animate-pulse" />
      </div>

      {/* skeleton grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="p-3 rounded-lg border border-mist-100 bg-white">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="h-6 w-12 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </Tile>
);
