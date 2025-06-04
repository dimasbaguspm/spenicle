import { createFileRoute } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { Badge, Button, IconButton, Tile } from '../../../../components';
import type { SummaryAccountsPeriod, SummaryTransactionsPeriod } from '../../../../types/api';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/accounts')({
  component: RouteComponent,
});

// Account names for display
const accountNames: Record<number, string> = {
  1: 'Main Checking',
  2: 'Savings Account',
  3: 'Credit Card',
};

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

function RouteComponent() {
  const [accountsIndex, setAccountsIndex] = useState(5); // June 2024
  const [accountsPeriodType, setAccountsPeriodType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

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

  // Get data based on breakdown type
  const getCurrentPeriodData = () => {
    if (accountsPeriodType === 'weekly') {
      return mockWeeklyPeriod;
    } else {
      return mockMonthlyPeriod;
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

  return (
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
                  <Badge variant={isPositive ? 'success' : 'warning'}>{account.totalTransactions} transactions</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Income</p>
                    <p className="font-semibold text-sage-600">${(account.totalIncome ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Expenses</p>
                    <p className="font-semibold text-coral-600">${(account.totalExpenses ?? 0).toLocaleString()}</p>
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
  );
}
