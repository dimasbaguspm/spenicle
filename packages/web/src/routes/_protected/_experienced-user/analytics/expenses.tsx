import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { Button, IconButton, Tile } from '../../../../components';
import type { SummaryCategoriesPeriod, SummaryTransactionsPeriod } from '../../../../types/api';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/expenses')({
  component: RouteComponent,
});

// Weekly categories data for June 2024
const mockWeeklyCategoriesPeriod: SummaryCategoriesPeriod = [
  {
    categoryId: 1,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-07T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 450,
    totalNet: -450,
    totalTransactions: 12,
  },
  {
    categoryId: 2,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-07T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 180,
    totalNet: -180,
    totalTransactions: 5,
  },
  {
    categoryId: 4,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-07T23:59:59Z',
    totalIncome: 1200,
    totalExpenses: 0,
    totalNet: 1200,
    totalTransactions: 1,
  },
];

// Monthly categories data for 2024
const mockMonthlyCategoriesPeriod: SummaryCategoriesPeriod = [
  {
    categoryId: 1,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 1850,
    totalNet: -1850,
    totalTransactions: 42,
  },
  {
    categoryId: 2,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 680,
    totalNet: -680,
    totalTransactions: 18,
  },
  {
    categoryId: 3,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 520,
    totalNet: -520,
    totalTransactions: 12,
  },
  {
    categoryId: 4,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    totalIncome: 5500,
    totalExpenses: 0,
    totalNet: 5500,
    totalTransactions: 4,
  },
  {
    categoryId: 5,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 800,
    totalNet: -800,
    totalTransactions: 24,
  },
];

// Yearly categories data for 2024
const mockYearlyCategoriesPeriod: SummaryCategoriesPeriod = [
  {
    categoryId: 1,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 18500,
    totalNet: -18500,
    totalTransactions: 420,
  },
  {
    categoryId: 2,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 8200,
    totalNet: -8200,
    totalTransactions: 180,
  },
  {
    categoryId: 3,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 6400,
    totalNet: -6400,
    totalTransactions: 120,
  },
  {
    categoryId: 4,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    totalIncome: 66000,
    totalExpenses: 0,
    totalNet: 66000,
    totalTransactions: 48,
  },
  {
    categoryId: 5,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 9600,
    totalNet: -9600,
    totalTransactions: 288,
  },
];

// Category names for display
const categoryNames: Record<number, string> = {
  1: 'Food & Dining',
  2: 'Transportation',
  3: 'Shopping',
  4: 'Salary',
  5: 'Entertainment',
};

// Category colors for display
const categoryColors: Record<number, string> = {
  1: 'bg-coral-500',
  2: 'bg-sage-500',
  3: 'bg-mist-500',
  4: 'bg-success-500',
  5: 'bg-warning-500',
};

const mockWeeklyPeriod: SummaryTransactionsPeriod = [
  {
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-07T23:59:59Z',
    totalIncome: 1200,
    totalExpenses: 850,
    netAmount: 350,
  },
  {
    startDate: '2024-06-08T00:00:00Z',
    endDate: '2024-06-14T23:59:59Z',
    totalIncome: 800,
    totalExpenses: 920,
    netAmount: -120,
  },
  {
    startDate: '2024-06-15T00:00:00Z',
    endDate: '2024-06-21T23:59:59Z',
    totalIncome: 2000,
    totalExpenses: 1100,
    netAmount: 900,
  },
  {
    startDate: '2024-06-22T00:00:00Z',
    endDate: '2024-06-28T23:59:59Z',
    totalIncome: 1500,
    totalExpenses: 980,
    netAmount: 520,
  },
];

// Monthly breakdown for 2024
const mockMonthlyPeriod: SummaryTransactionsPeriod = [
  {
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-31T23:59:59Z',
    totalIncome: 5200,
    totalExpenses: 3850,
    netAmount: 1350,
  },
  {
    startDate: '2024-02-01T00:00:00Z',
    endDate: '2024-02-29T23:59:59Z',
    totalIncome: 4800,
    totalExpenses: 4100,
    netAmount: 700,
  },
  {
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-03-31T23:59:59Z',
    totalIncome: 6000,
    totalExpenses: 4500,
    netAmount: 1500,
  },
  {
    startDate: '2024-04-01T00:00:00Z',
    endDate: '2024-04-30T23:59:59Z',
    totalIncome: 5500,
    totalExpenses: 4200,
    netAmount: 1300,
  },
  {
    startDate: '2024-05-01T00:00:00Z',
    endDate: '2024-05-31T23:59:59Z',
    totalIncome: 5800,
    totalExpenses: 4600,
    netAmount: 1200,
  },
  {
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    totalIncome: 5500,
    totalExpenses: 3850,
    netAmount: 1650,
  },
];

function RouteComponent() {
  const [categoriesPeriodType, setCategoriesPeriodType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [categoriesIndex, setCategoriesIndex] = useState(5);

  // Get categories data based on period type
  const getCurrentCategoriesData = () => {
    if (categoriesPeriodType === 'weekly') {
      return mockWeeklyCategoriesPeriod;
    } else if (categoriesPeriodType === 'monthly') {
      return mockMonthlyCategoriesPeriod;
    } else {
      return mockYearlyCategoriesPeriod;
    }
  };

  const totalCategoryExpenses = getCurrentCategoriesData().reduce(
    (sum, cat) => sum + Math.abs(cat.totalExpenses ?? 0),
    0
  );

  // Navigation handlers
  const navigatePeriod = (
    direction: 'prev' | 'next',
    setter: (value: number) => void,
    currentIndex: number,
    type: 'weekly' | 'monthly' | 'yearly'
  ) => {
    const maxIndex = type === 'weekly' ? 11 : 3; // 12 months or 4 years
    if (direction === 'prev' && currentIndex > 0) {
      setter(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < maxIndex) {
      setter(currentIndex + 1);
    }
  };

  // Helper functions for getting period titles
  const getPeriodTitle = (type: 'weekly' | 'monthly' | 'yearly', index: number) => {
    if (type === 'weekly') {
      // For weekly view, show the current week range from the data
      const weekData = getCurrentPeriodData();
      if (weekData && weekData.length > 0) {
        // Show the range of the current month's weeks (e.g., "Jun 1-28, 2024")
        const firstWeek = weekData[0];
        const lastWeek = weekData[weekData.length - 1];
        const startDate = new Date(firstWeek.startDate ?? '');
        const endDate = new Date(lastWeek.endDate ?? '');

        const startDay = startDate.getDate();
        const endDay = endDate.getDate();
        const month = startDate.toLocaleDateString('en-US', { month: 'short' });
        const year = startDate.getFullYear();

        return `${month} ${startDay}-${endDay}, ${year}`;
      }
      return 'Jun 1-28, 2024'; // fallback
    } else if (type === 'monthly') {
      // For monthly view, show month and year
      const months = [
        'January 2022',
        'February 2022',
        'March 2022',
        'April 2022',
        'May 2022',
        'June 2022',
        'July 2022',
        'August 2022',
        'September 2022',
        'October 2022',
        'November 2022',
        'December 2022',
        'January 2023',
        'February 2023',
        'March 2023',
        'April 2023',
        'May 2023',
        'June 2023',
        'July 2023',
        'August 2023',
        'September 2023',
        'October 2023',
        'November 2023',
        'December 2023',
        'January 2024',
        'February 2024',
        'March 2024',
        'April 2024',
        'May 2024',
        'June 2024',
        'July 2024',
        'August 2024',
        'September 2024',
        'October 2024',
        'November 2024',
        'December 2024',
      ];
      return months[index] || 'June 2024';
    } else {
      // For yearly view, show the year
      const years = ['2022', '2023', '2024', '2025'];
      return years[index] || '2024';
    }
  };

  // Get data based on breakdown type
  const getCurrentPeriodData = () => {
    if (categoriesPeriodType === 'weekly') {
      return mockWeeklyPeriod;
    } else {
      return mockMonthlyPeriod;
    }
  };

  return (
    <Tile className="p-6">
      <div className="flex flex-col gap-4 mb-6">
        {/* First line: Tab title + chevron navigation */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Expenses by Category</h3>

          <div className="flex items-center gap-2">
            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => navigatePeriod('prev', setCategoriesIndex, categoriesIndex, categoriesPeriodType)}
              disabled={categoriesIndex <= 0}
              className="text-slate-600 hover:text-coral-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </IconButton>

            <span className="font-medium text-slate-900 min-w-[120px] text-center">
              {getPeriodTitle(categoriesPeriodType, categoriesIndex)}
            </span>

            <IconButton
              variant="ghost"
              size="sm"
              onClick={() => navigatePeriod('next', setCategoriesIndex, categoriesIndex, categoriesPeriodType)}
              disabled={categoriesIndex >= (categoriesPeriodType === 'weekly' ? 11 : 3)}
              className="text-slate-600 hover:text-coral-600"
            >
              <ChevronRight className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        {/* Second line: Period selector buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={categoriesPeriodType === 'weekly' ? 'coral' : 'slate-outline'}
            size="sm"
            onClick={() => setCategoriesPeriodType('weekly')}
          >
            Weekly
          </Button>
          <Button
            variant={categoriesPeriodType === 'monthly' ? 'coral' : 'slate-outline'}
            size="sm"
            onClick={() => setCategoriesPeriodType('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={categoriesPeriodType === 'yearly' ? 'coral' : 'slate-outline'}
            size="sm"
            onClick={() => setCategoriesPeriodType('yearly')}
          >
            Yearly
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {getCurrentCategoriesData()
          .filter((cat) => (cat.totalExpenses ?? 0) > 0)
          .sort((a, b) => (b.totalExpenses ?? 0) - (a.totalExpenses ?? 0))
          .map((category) => {
            const percentage =
              totalCategoryExpenses > 0 ? ((category.totalExpenses ?? 0) / totalCategoryExpenses) * 100 : 0;
            const categoryName = categoryNames[category.categoryId ?? 0] ?? 'Unknown Category';
            const colorClass = categoryColors[category.categoryId ?? 0] ?? 'bg-slate-500';

            return (
              <div key={category.categoryId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${colorClass}`}></div>
                  <span className="font-medium text-slate-900">{categoryName}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">${(category.totalExpenses ?? 0).toLocaleString()}</p>
                  <p className="text-sm text-slate-500">
                    {percentage.toFixed(1)}% • {category.totalTransactions} txns
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </Tile>
  );
}
