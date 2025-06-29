import dayjs from 'dayjs';
import { TrendingUp, TrendingDown, Folder, Activity } from 'lucide-react';
import { useMemo, type FC } from 'react';

import { Tile, Tab } from '../../../../components';
import { useApiSummaryCategoriesQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';
import type { Category } from '../../../../types/api';

interface CategoryInsight {
  label: string;
  value: string;
  trend?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

export type PeriodType = 'today' | 'week' | 'month';

interface MobileCategoryInsightsWidgetProps {
  categories: Category[];
  selectedPeriod: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
}

/**
 * MobileCategoryInsightsWidget displays essential category metrics in a mobile-optimized layout.
 * Shows total categories and current period income/expenses with period selection.
 */
export const MobileCategoryInsightsWidget: FC<MobileCategoryInsightsWidgetProps> = ({
  categories,
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

  const [summaryData, , state] = useApiSummaryCategoriesQuery({
    startDate,
    endDate,
  });

  // calculate essential category insights
  const insights = useMemo((): CategoryInsight[] => {
    // current period financial totals
    const currentPeriodIncome = (summaryData ?? []).reduce(
      (sum: number, summary) => sum + (summary.totalIncome ?? 0),
      0
    );
    const currentPeriodExpenses = (summaryData ?? []).reduce(
      (sum: number, summary) => sum + (summary.totalExpenses ?? 0),
      0
    );
    const currentPeriodTransactions = (summaryData ?? []).reduce(
      (sum: number, summary) => sum + (summary.totalTransactions ?? 0),
      0
    );

    return [
      {
        label: 'Total Categories',
        value: categories.length.toString(),
        trend: categories.length > 0 ? 'neutral' : 'negative',
        icon: Folder,
        iconColor: categories.length > 0 ? 'text-mist-600' : 'text-slate-400',
      },
      {
        label: `Transactions`,
        value: currentPeriodTransactions.toString(),
        trend: currentPeriodTransactions > 0 ? 'neutral' : 'neutral',
        icon: Activity,
        iconColor: currentPeriodTransactions > 0 ? 'text-mist-600' : 'text-slate-400',
      },
      {
        label: `Income`,
        value: formatAmount(currentPeriodIncome, {
          compact: true,
          hidePrefix: true,
        }),
        trend: currentPeriodIncome > 0 ? 'positive' : 'neutral',
        icon: TrendingUp,
        iconColor: 'text-sage-600',
      },
      {
        label: `Expenses`,
        value: formatAmount(currentPeriodExpenses, {
          compact: true,
          hidePrefix: true,
        }),
        trend: currentPeriodExpenses > 0 ? 'negative' : 'neutral',
        icon: TrendingDown,
        iconColor: 'text-coral-600',
      },
    ];
  }, [categories, summaryData]);

  // show skeleton loader while data is loading
  if (state.isLoading && !summaryData) {
    return <InsightsSkeletonLoader />;
  }

  return (
    <Tile className="p-4">
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">Overview</h3>
            <p className="text-sm text-slate-500">Key metrics with period selection</p>
          </div>

          {/* enhanced period selector with better mobile UX */}
          <Tab value={selectedPeriod} onValueChange={(value) => onPeriodChange(value as PeriodType)} type="tabs">
            <Tab.List className="w-full grid grid-cols-3 gap-1 p-1 bg-mist-100 rounded-xl">
              <Tab.Trigger
                value="today"
                className="text-center text-xs font-medium px-3 py-2 rounded-lg transition-all"
              >
                Today
              </Tab.Trigger>
              <Tab.Trigger value="week" className="text-center text-xs font-medium px-3 py-2 rounded-lg transition-all">
                This Week
              </Tab.Trigger>
              <Tab.Trigger
                value="month"
                className="text-center text-xs font-medium px-3 py-2 rounded-lg transition-all"
              >
                This Month
              </Tab.Trigger>
            </Tab.List>
          </Tab>
        </div>

        {/* mobile-optimized 2x2 grid with smart visual indicators */}
        <div className="grid grid-cols-2 gap-3">
          {insights.map((insight, index) => {
            const getTrendStyles = (trend?: string) => {
              switch (trend) {
                case 'positive':
                  return 'border-sage-200 bg-sage-50';
                case 'negative':
                  return 'border-coral-200 bg-coral-50';
                default:
                  return 'border-mist-200 bg-white';
              }
            };

            const getValueColor = (trend?: string) => {
              switch (trend) {
                case 'positive':
                  return 'text-sage-700';
                case 'negative':
                  return 'text-coral-700';
                default:
                  return 'text-slate-900';
              }
            };

            return (
              <div key={index} className={`p-3 rounded-lg border transition-colors ${getTrendStyles(insight.trend)}`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-lg font-bold tabular-nums leading-tight ${getValueColor(insight.trend)}`}>
                      {insight.value}
                    </p>
                    <insight.icon className={`h-4 w-4 ${insight.iconColor}`} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{insight.label}</p>
                </div>
              </div>
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
