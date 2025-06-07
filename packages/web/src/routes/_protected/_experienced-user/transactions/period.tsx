import { createFileRoute, useSearch } from '@tanstack/react-router';
import dayjs from 'dayjs';

import { PageHeader, PageLayout, BarChart, RadarChart } from '../../../../components';
import { LineChart } from '../../../../components/line-chart';
import { getRadarChartData } from '../../../../components/radar-chart/helpers';
import { useApiSummaryCategoriesQuery, useApiSummaryTransactionsQuery, useApiCategoriesQuery } from '../../../../hooks';
import type { Category } from '../../../../types/api';

export const Route = createFileRoute('/_protected/_experienced-user/transactions/period')({
  component: RouteComponent,
});

function RouteComponent() {
  const { startDate, endDate } = useSearch({
    strict: false,
    select: (bar) => {
      const { startDate: unsanitizedStartDate, endDate: unsanitizedEndDate } = bar ?? {};

      const defaultStartDate = dayjs().startOf('month');
      const defaultEndDate = dayjs().endOf('day');

      const start = unsanitizedStartDate ? dayjs(unsanitizedStartDate) : dayjs(defaultStartDate);
      const end = unsanitizedEndDate ? dayjs(unsanitizedEndDate) : dayjs(defaultEndDate);

      return {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    },
  });

  const [summary, , summaryState] = useApiSummaryTransactionsQuery({ startDate, endDate });

  const [summaryCategories] = useApiSummaryCategoriesQuery({
    startDate,
    endDate,
  });

  const [categoriesResponse] = useApiCategoriesQuery({ pageSize: 1000 });
  const allCategories =
    categoriesResponse && 'items' in categoriesResponse ? (categoriesResponse.items as Category[]) : [];

  // Prepare chart data (assuming summary is an array of { startDate, endDate, totalIncome, totalExpenses, netAmount })
  const chartData = (summary ?? []).map((item) => ({
    date: dayjs(item.startDate).format('MMM D'),
    totalNet: item.netAmount ?? 0,
    totalIncome: item.totalIncome ?? 0,
    totalExpenses: item.totalExpenses ?? 0, // Allow negative values for line chart
  }));

  // Prepare bar chart data: only income and expenses, grouped by date
  const barChartData = (summary ?? []).map((item) => ({
    date: dayjs(item.startDate).format('MMM D'),
    totalIncome: item.totalIncome ?? 0,
    totalExpenses: Math.abs(item.totalExpenses ?? 0), // Always positive for visual clarity
    totalNet: item.netAmount ?? 0,
  }));

  // Prepare radar chart data for category breakdown
  const radarChartData = getRadarChartData(allCategories, summaryCategories ?? []);

  return (
    <PageLayout
      background="cream"
      mainProps={{ padding: 'none' }}
      header={
        <div>
          <PageHeader
            title="Transactions Period"
            showBackButton
            rightContent={
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium text-primary-700 bg-primary-50 rounded px-2 py-0.5"
                  aria-label={`Selected period: ${formatPeriod(startDate, endDate)}`}
                >
                  {formatPeriod(startDate, endDate)}
                </span>
              </div>
            }
            className="p-4 pb-0 mb-2"
          />
        </div>
      }
    >
      <div className="px-4 pt-2 pb-4">
        {summaryState.isLoading && (
          <div className="flex justify-center items-center h-48 text-primary-400">Loading chart...</div>
        )}
        {summaryState.isError && (
          <div className="flex justify-center items-center h-48 text-error-600">Error loading chart</div>
        )}
        {summary && radarChartData.length > 0 && (
          <>
            <LineChart data={chartData} xKey="date" dataKey={['totalExpenses', 'totalIncome']} />
            <div className="mt-8">
              <BarChart data={barChartData} xKey="date" dataKey={['totalExpenses', 'totalNet']} />
            </div>
            <div className="mt-8">
              <RadarChart data={radarChartData} dataKey={['totalExpenses', 'totalNet']} />
            </div>
          </>
        )}
      </div>
      <p>Small Details</p>
      <p>Transaction List</p>
    </PageLayout>
  );
}

// Helper to format the period concisely
function formatPeriod(start: string, end: string): string {
  const s = dayjs(start);
  const e = dayjs(end);
  if (s.isSame(e, 'month') && s.date() === 1 && e.date() === e.daysInMonth()) {
    // Full month
    return s.format('MMM YYYY');
  }
  if (s.isSame(e, 'month')) {
    return `${s.format('MMM D')} - ${e.format('D, YYYY')}`;
  }
  if (s.year() === e.year()) {
    return `${s.format('MMM D')} - ${e.format('MMM D, YYYY')}`;
  }
  // Different years
  return `${s.format('MMM D, YYYY')} - ${e.format('MMM D, YYYY')}`;
}
