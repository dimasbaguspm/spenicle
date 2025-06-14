import { Tile } from '../../../../components';

import { AccountSummaryHeader } from './account-summary-header';
import { AccountSummaryList } from './account-summary-list';
import { AccountSummaryStats } from './account-summary-stats';

export interface AccountSummarySectionProps {
  /**
   * Header configuration for the section
   */
  header?: {
    title?: string;
    activeCount?: number;
  };
  /**
   * Summary statistics data
   */
  stats?: {
    totalNetWorth: number;
    thisMonth: number;
    thisWeek: number;
    currencySymbol?: string;
  };
  /**
   * List of most active accounts
   */
  accounts?: Array<{
    id: string;
    name: string;
    lastActivity: string;
    amount: number;
    iconColor: string;
    iconBgColor: string;
  }>;
  /**
   * Click handler for the entire section
   */
  onClick?: () => void;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * AccountSummarySection displays a compact overview of account activity and summary statistics.
 * This component is designed for the dashboard home page to provide quick insights.
 */
export function AccountSummarySection({
  header = {
    title: 'Account Summary',
    activeCount: 3,
  },
  stats = {
    totalNetWorth: 5200,
    thisMonth: 342,
    thisWeek: 78,
    currencySymbol: '$',
  },
  accounts = [
    {
      id: '1',
      name: 'Main Checking',
      lastActivity: 'Today',
      amount: 3200,
      iconColor: 'text-sage-600',
      iconBgColor: 'bg-sage-100',
    },
    {
      id: '2',
      name: 'Savings Account',
      lastActivity: '2 days ago',
      amount: 1800,
      iconColor: 'text-mist-600',
      iconBgColor: 'bg-mist-100',
    },
    {
      id: '3',
      name: 'Credit Card',
      lastActivity: '1 week ago',
      amount: -245,
      iconColor: 'text-coral-600',
      iconBgColor: 'bg-coral-100',
    },
  ],
  onClick,
  className,
}: AccountSummarySectionProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      <AccountSummaryHeader title={header.title} activeCount={header.activeCount} />
      <Tile
        className={`p-6 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? handleKeyDown : undefined}
      >
        <div className="space-y-6">
          <AccountSummaryStats
            totalNetWorth={stats.totalNetWorth}
            thisMonth={stats.thisMonth}
            thisWeek={stats.thisWeek}
            currencySymbol={stats.currencySymbol}
          />
          <AccountSummaryList accounts={accounts} />
        </div>
      </Tile>
    </div>
  );
}
