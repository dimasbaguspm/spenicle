import { useNavigate, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type { FC } from 'react';

import { Button, PageLayout, Tile } from '../../../components';
import { useApiAccountsQuery } from '../../../hooks';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';
import { AccountList, AccountListHeader } from '../components';

export const MobileAccountDashboardPage: FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const [accountsData] = useApiAccountsQuery();
  const { openDrawer } = useDrawerRouterProvider();

  const accounts = accountsData?.items ?? [];
  const accountCount = accounts.length;

  // Get search query from URL or default to empty string
  const searchQuery = search.search ?? '';

  const handleSearchChange = async (newSearchQuery: string) => {
    // Update URL with search parameter
    await navigate({
      // @ts-expect-error is a bug from tanstack/react-router - search param typing
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        search: newSearchQuery || undefined, // Remove param if empty
      }),
      replace: true,
    });
  };

  const handleAddAccount = async () => {
    await openDrawer('add-account');
  };

  return (
    <PageLayout
      background="cream"
      title="Accounts"
      showBackButton={true}
      rightContent={
        <Button variant="coral" size="sm" onClick={handleAddAccount} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Account</span>
          <span className="sm:hidden">Add</span>
        </Button>
      }
    >
      <Tile>
        <AccountListHeader accountCount={accountCount} searchValue={searchQuery} onSearchChange={handleSearchChange} />
        <AccountList searchQuery={searchQuery} onSearchChange={handleSearchChange} />
      </Tile>
    </PageLayout>
  );
};
