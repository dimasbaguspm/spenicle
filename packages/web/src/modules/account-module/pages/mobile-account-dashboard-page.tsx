import { useNavigate, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState, type FC } from 'react';

import { Button, PageLayout } from '../../../components';
import { useApiAccountsQuery } from '../../../hooks';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';
import type { Account } from '../../../types/api';
import {
  MobileAccountInsightsWidget,
  MobileAccountSummarySection,
  type PeriodType,
} from '../components/mobile-account-widgets';

export const MobileAccountDashboardPage: FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const [accountsData] = useApiAccountsQuery({ pageSize: 1000 });
  const { openDrawer } = useDrawerRouterProvider();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');

  const accounts = accountsData?.items ?? [];

  // get search query from URL or default to empty string
  const searchQuery = search.search ?? '';

  const handleSearchChange = async (newSearchQuery: string) => {
    // update URL with search parameter
    await navigate({
      // @ts-expect-error is a bug from tanstack/react-router - search param typing
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        search: newSearchQuery || undefined, // remove param if empty
      }),
      replace: true,
    });
  };

  const handleAddAccount = async () => {
    await openDrawer('add-account');
  };

  const handleAccountCardClick = async (account: Account) => {
    await openDrawer('edit-account', { accountId: account.id });
  };

  return (
    <PageLayout
      background="cream"
      title="Accounts"
      showBackButton={true}
      rightContent={
        <Button
          variant="coral"
          size="sm"
          onClick={handleAddAccount}
          className="flex items-center"
          iconLeft={<Plus className="w-4 h-4" />}
        >
          <span className="inline">Add Account</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* financial insights widget - key metrics at a glance */}
        <MobileAccountInsightsWidget
          accounts={accounts}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        {/* enhanced account summary with integrated search and mobile-optimized layout */}
        <MobileAccountSummarySection
          accounts={accounts}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onAccountCardClick={handleAccountCardClick}
          selectedPeriod={selectedPeriod}
        />
      </div>
    </PageLayout>
  );
};
