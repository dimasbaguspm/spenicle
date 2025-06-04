import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { PageLayout, Select, Button, Badge, Tile, Tab, IconButton } from '../../../components';
import type { SummaryTransactionsPeriod, SummaryCategoriesPeriod, SummaryAccountsPeriod } from '../../../types/api';

export const Route = createFileRoute('/_protected/_experienced-user/analytics')({
  component: AnalyticsComponent,
});

// Hardcoded data for demo purposes following the API schemas
// Weekly breakdown for June 2024
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

// Weekly accounts data for June 2024
const mockWeeklyAccountsPeriod: SummaryAccountsPeriod = [
  {
    accountId: 1,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-07T23:59:59Z',
    totalIncome: 800,
    totalExpenses: 520,
    totalNet: 280,
    totalTransactions: 12,
  },
  {
    accountId: 2,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-07T23:59:59Z',
    totalIncome: 400,
    totalExpenses: 330,
    totalNet: 70,
    totalTransactions: 8,
  },
];

// Monthly accounts data for 2024
const mockMonthlyAccountsPeriod: SummaryAccountsPeriod = [
  {
    accountId: 1,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    totalIncome: 3200,
    totalExpenses: 2100,
    totalNet: 1100,
    totalTransactions: 45,
  },
  {
    accountId: 2,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    totalIncome: 2300,
    totalExpenses: 1750,
    totalNet: 550,
    totalTransactions: 32,
  },
  {
    accountId: 3,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-06-30T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 0,
    totalNet: 0,
    totalTransactions: 0,
  },
];

// Yearly accounts data for 2024
const mockYearlyAccountsPeriod: SummaryAccountsPeriod = [
  {
    accountId: 1,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    totalIncome: 38400,
    totalExpenses: 25200,
    totalNet: 13200,
    totalTransactions: 540,
  },
  {
    accountId: 2,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    totalIncome: 27600,
    totalExpenses: 21000,
    totalNet: 6600,
    totalTransactions: 384,
  },
  {
    accountId: 3,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-12-31T23:59:59Z',
    totalIncome: 0,
    totalExpenses: 500,
    totalNet: -500,
    totalTransactions: 12,
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

// Account names for display
const accountNames: Record<number, string> = {
  1: 'Main Checking',
  2: 'Savings Account',
  3: 'Credit Card',
};

// Category colors for display
const categoryColors: Record<number, string> = {
  1: 'bg-coral-500',
  2: 'bg-sage-500',
  3: 'bg-mist-500',
  4: 'bg-success-500',
  5: 'bg-warning-500',
};

// Helper functions for date navigation and formatting
const formatDateRange = (startDate: string, endDate: string, type: 'weekly' | 'monthly' | 'yearly') => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (type === 'weekly') {
    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });

    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth}`;
    } else {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
  } else if (type === 'monthly') {
    return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } else {
    return start.getFullYear().toString();
  }
};

function AnalyticsComponent() {
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [periodBreakdownType, setPeriodBreakdownType] = useState<'weekly' | 'monthly'>('weekly');
  const [categoriesPeriodType, setCategoriesPeriodType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [accountsPeriodType, setAccountsPeriodType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  // Period indices for navigation (0-based, where 0 = Jan 2024 for weekly/monthly, 0 = 2022 for yearly)
  const [periodBreakdownIndex, setPeriodBreakdownIndex] = useState(5); // June 2024
  const [categoriesIndex, setCategoriesIndex] = useState(5); // June 2024
  const [accountsIndex, setAccountsIndex] = useState(5); // June 2024
  const [activeTab, setActiveTab] = useState('overview');

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

  // Calculate totals from weekly data for main summary
  const totalExpenses = mockWeeklyPeriod.reduce((sum, period) => sum + (period.totalExpenses ?? 0), 0);
  const totalIncome = mockWeeklyPeriod.reduce((sum, period) => sum + (period.totalIncome ?? 0), 0);
  const netAmount = totalIncome - totalExpenses;

  // Get data based on breakdown type
  const getCurrentPeriodData = () => {
    if (periodBreakdownType === 'weekly') {
      return mockWeeklyPeriod;
    } else {
      return mockMonthlyPeriod;
    }
  };

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

  // Get accounts data based on period type
  const getCurrentAccountsData = () => {
    if (accountsPeriodType === 'weekly') {
      return mockWeeklyAccountsPeriod;
    } else if (accountsPeriodType === 'monthly') {
      return mockMonthlyAccountsPeriod;
    } else {
      return mockYearlyAccountsPeriod;
    }
  };

  const totalCategoryExpenses = getCurrentCategoriesData().reduce(
    (sum, cat) => sum + Math.abs(cat.totalExpenses ?? 0),
    0
  );

  return (
    <PageLayout
      background="cream"
      title="Analytics"
      showBackButton={true}
      rightContent={
        <Select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="this-year">This Year</option>
        </Select>
      }
    >
      <div className="space-y-6">
        {/* Financial Summary Period Cards - Always visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tile className="p-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Total Expenses</h3>
            <p className="text-2xl font-bold text-coral-600">${totalExpenses.toLocaleString()}</p>
            <p className="text-sm text-coral-500 mt-1">↑ 8% from last period</p>
          </Tile>

          <Tile className="p-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Total Income</h3>
            <p className="text-2xl font-bold text-sage-600">${totalIncome.toLocaleString()}</p>
            <p className="text-sm text-sage-500 mt-1">↑ 5% from last period</p>
          </Tile>

          <Tile className="p-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Net Amount</h3>
            <p className={`text-2xl font-bold ${netAmount >= 0 ? 'text-sage-600' : 'text-coral-600'}`}>
              {netAmount >= 0 ? '+' : ''}${netAmount.toLocaleString()}
            </p>
            <p className={`text-sm mt-1 ${netAmount >= 0 ? 'text-sage-500' : 'text-coral-500'}`}>
              {netAmount >= 0 ? '↑' : '↓'} {Math.abs((netAmount / totalIncome) * 100).toFixed(1)}% net ratio
            </p>
          </Tile>
        </div>

        {/* Tab Navigation */}
        <Tab value={activeTab} onValueChange={setActiveTab} variant="tabs">
          <Tab.List className="w-full grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            <Tab.Trigger value="overview" className="text-center">
              Period Breakdown
            </Tab.Trigger>
            <Tab.Trigger value="categories" className="text-center">
              Categories
            </Tab.Trigger>
            <Tab.Trigger value="accounts" className="text-center">
              Accounts
            </Tab.Trigger>
          </Tab.List>
          {/* Period Breakdown Tab */}
          <Tab.Content value="overview">
            <Tile className="p-6">
              <div className="flex flex-col gap-4 mb-6">
                {/* First line: Tab title + chevron navigation */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Period Breakdown</h3>

                  <div className="flex items-center gap-2">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigatePeriod('prev', setPeriodBreakdownIndex, periodBreakdownIndex, periodBreakdownType)
                      }
                      disabled={periodBreakdownIndex <= 0}
                      className="text-slate-600 hover:text-coral-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </IconButton>

                    <span className="font-medium text-slate-900 min-w-[120px] text-center">
                      {getPeriodTitle(periodBreakdownType, periodBreakdownIndex)}
                    </span>

                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigatePeriod('next', setPeriodBreakdownIndex, periodBreakdownIndex, periodBreakdownType)
                      }
                      disabled={periodBreakdownIndex >= (periodBreakdownType === 'weekly' ? 11 : 3)}
                      className="text-slate-600 hover:text-coral-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                {/* Second line: Period selector buttons */}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant={periodBreakdownType === 'weekly' ? 'coral' : 'slate-outline'}
                    size="sm"
                    onClick={() => setPeriodBreakdownType('weekly')}
                  >
                    Weekly
                  </Button>
                  <Button
                    variant={periodBreakdownType === 'monthly' ? 'coral' : 'slate-outline'}
                    size="sm"
                    onClick={() => setPeriodBreakdownType('monthly')}
                  >
                    Monthly
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {getCurrentPeriodData()
                  .slice()
                  .reverse()
                  .map((period, index) => {
                    // Use the formatDateRange function for cleaner period titles
                    const periodTitle = formatDateRange(
                      period.startDate ?? '',
                      period.endDate ?? '',
                      periodBreakdownType
                    );

                    return (
                      <div key={index} className="bg-cream-50 rounded-lg p-4 border border-mist-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-slate-900">{periodTitle}</h4>
                          <Badge variant={period.netAmount && period.netAmount >= 0 ? 'success' : 'warning'}>
                            {period.netAmount && period.netAmount >= 0 ? 'Positive' : 'Negative'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Income</p>
                            <p className="font-semibold text-sage-600">${(period.totalIncome ?? 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Expenses</p>
                            <p className="font-semibold text-coral-600">
                              ${(period.totalExpenses ?? 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Net</p>
                            <p
                              className={`font-semibold ${
                                period.netAmount && period.netAmount >= 0 ? 'text-sage-600' : 'text-coral-600'
                              }`}
                            >
                              {period.netAmount && period.netAmount >= 0 ? '+' : ''}$
                              {(period.netAmount ?? 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Tile>
          </Tab.Content>{' '}
          {/* Expenses by Category Tab */}
          <Tab.Content value="categories">
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
          </Tab.Content>
          {/* Account Activity Tab */}
          <Tab.Content value="accounts">
            <Tile className="p-6">
              <div className="flex flex-col gap-4 mb-6">
                {/* First line: Tab title + chevron navigation */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Account Activity</h3>

                  <div className="flex items-center gap-2">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => navigatePeriod('prev', setAccountsIndex, accountsIndex, accountsPeriodType)}
                      disabled={accountsIndex <= 0}
                      className="text-slate-600 hover:text-coral-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </IconButton>

                    <span className="font-medium text-slate-900 min-w-[120px] text-center">
                      {getPeriodTitle(accountsPeriodType, accountsIndex)}
                    </span>

                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={() => navigatePeriod('next', setAccountsIndex, accountsIndex, accountsPeriodType)}
                      disabled={accountsIndex >= (accountsPeriodType === 'weekly' ? 11 : 3)}
                      className="text-slate-600 hover:text-coral-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                {/* Second line: Period selector buttons */}
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant={accountsPeriodType === 'weekly' ? 'coral' : 'slate-outline'}
                    size="sm"
                    onClick={() => setAccountsPeriodType('weekly')}
                  >
                    Weekly
                  </Button>
                  <Button
                    variant={accountsPeriodType === 'monthly' ? 'coral' : 'slate-outline'}
                    size="sm"
                    onClick={() => setAccountsPeriodType('monthly')}
                  >
                    Monthly
                  </Button>
                  <Button
                    variant={accountsPeriodType === 'yearly' ? 'coral' : 'slate-outline'}
                    size="sm"
                    onClick={() => setAccountsPeriodType('yearly')}
                  >
                    Yearly
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {getCurrentAccountsData()
                  .sort((a, b) => (b.totalTransactions ?? 0) - (a.totalTransactions ?? 0))
                  .map((account) => {
                    const accountName = accountNames[account.accountId ?? 0] ?? `Account ${account.accountId}`;
                    const isPositive = (account.totalNet ?? 0) >= 0;

                    return (
                      <div key={account.accountId} className="bg-cream-50 rounded-lg p-4 border border-mist-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900">{accountName}</h4>
                          <Badge variant={isPositive ? 'success' : 'warning'}>
                            {account.totalTransactions} transactions
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Income</p>
                            <p className="font-semibold text-sage-600">
                              ${(account.totalIncome ?? 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Expenses</p>
                            <p className="font-semibold text-coral-600">
                              ${(account.totalExpenses ?? 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Net</p>
                            <p className={`font-semibold ${isPositive ? 'text-sage-600' : 'text-coral-600'}`}>
                              {isPositive ? '+' : ''}${(account.totalNet ?? 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Tile>
          </Tab.Content>
        </Tab>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="coral" className="flex-1">
            Export Report
          </Button>
          <Button variant="outline" className="flex-1">
            Set Budget Goals
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
