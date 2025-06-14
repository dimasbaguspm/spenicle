import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Calendar, BarChart3, CreditCard, Tag } from 'lucide-react';

import { PageLayout } from '../../../components';
import {
  Header,
  QuickActions,
  RecentActivitySection,
  AccountSummarySection,
  type QuickAction,
} from '../../../modules/dashboard-module';

export const Route = createFileRoute('/_protected/_experienced-user/')({
  component: HomeComponent,
});

function HomeComponent() {
  const navigate = useNavigate();

  // Define quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: 'view-transactions',
      label: 'Transactions',
      icon: Calendar,
      iconColor: 'text-sage-600',
      iconBgColor: 'bg-sage-100',
      onClick: async () => {
        await navigate({ to: '/transactions' });
      },
    },
    {
      id: 'view-categories',
      label: 'Categories',
      icon: Tag,
      iconColor: 'text-coral-600',
      iconBgColor: 'bg-coral-100',
      onClick: async () => {
        await navigate({ to: '/settings/categories' });
      },
    },
    {
      id: 'add-account',
      label: 'Accounts',
      icon: CreditCard,
      iconColor: 'text-slate-600',
      iconBgColor: 'bg-slate-100',
      onClick: async () => {
        await navigate({ to: '/settings/accounts' });
      },
    },
    {
      id: 'view-analytics',
      label: 'Analytics',
      icon: BarChart3,
      iconColor: 'text-mist-600',
      iconBgColor: 'bg-mist-100',
      onClick: async () => {
        await navigate({ to: '/analytics' });
      },
    },
  ];

  return (
    <PageLayout background="cream" mainProps={{ padding: 'md' }}>
      <div className="space-y-5">
        <Header />
        <QuickActions actions={quickActions} />
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
              await navigate({ to: '/transactions' });
            },
          }}
        />

        <AccountSummarySection />
      </div>
    </PageLayout>
  );
}
