import { useNavigate } from '@tanstack/react-router';
import type { FC } from 'react';

import { PageLayout } from '../../../components';
import { AccountSummarySection, RecentActivitySection } from '../components';

export const DesktopDashboardPage: FC = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <RecentActivitySection
        trackingStreak={{
          streakDays: 23,
          progressPercentage: 76,
          daysToMilestone: 7,
          onClick: async () => {
            await navigate({ to: '/analytics' });
          },
        }}
        todayTransactions={{
          onClick: async () => {
            await navigate({ to: '/' });
          },
        }}
      />

      <AccountSummarySection />
    </PageLayout>
  );
};
