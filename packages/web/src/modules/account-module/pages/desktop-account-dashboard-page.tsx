import { useNavigate, useSearch } from '@tanstack/react-router';
import type { FC } from 'react';

import { PageLayout, Tile } from '../../../components';
import { useApiAccountsQuery } from '../../../hooks';
import { AccountList, AccountListHeader } from '../components';

export const DesktopAccountDashboardPage: FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const [accountsData] = useApiAccountsQuery();

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

  return (
    <PageLayout>
      <Tile>
        <AccountListHeader accountCount={accountCount} searchValue={searchQuery} onSearchChange={handleSearchChange} />
        <AccountList searchQuery={searchQuery} onSearchChange={handleSearchChange} />
      </Tile>
    </PageLayout>
  );
};
