import { TodayTransactionsCard, type TodayTransactionsCardProps } from './today-transactions-card';
import { TrackingStreakCard, type TrackingStreakCardProps } from './tracking-streak-card';

export interface RecentActivitySectionProps {
  /**
   * Configuration for the tracking streak card
   */
  trackingStreak: TrackingStreakCardProps;
  /**
   * Configuration for today's transactions card
   */
  todayTransactions: TodayTransactionsCardProps;
  /**
   * Optional custom title for the section
   */
  title?: string;
  /**
   * Optional status indicator text (e.g., "Live Updates")
   */
  statusText?: string;
}

/**
 * RecentActivitySection combines the tracking streak and today's transactions cards
 * in a responsive grid layout with a section header. This component provides a unified
 * interface for displaying recent user activity data with consistent visual hierarchy.
 */
export function RecentActivitySection({
  trackingStreak,
  todayTransactions,
  title = 'Recent Activity',
  statusText = 'Today',
}: RecentActivitySectionProps) {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-6 bg-mist-400 rounded-full"></div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {statusText && <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{statusText}</div>}
      </div>

      {/* Activity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrackingStreakCard {...trackingStreak} />
        <TodayTransactionsCard {...todayTransactions} />
      </div>
    </div>
  );
}
