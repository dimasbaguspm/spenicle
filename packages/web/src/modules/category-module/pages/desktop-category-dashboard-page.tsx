import { useNavigate, useSearch } from '@tanstack/react-router';
import type { FC } from 'react';

import { PageLayout, Tile } from '../../../components';
import { useApiCategoriesQuery } from '../../../hooks';
import { CategoriesList, CategoriesListHeader } from '../components/categories-list';

export const DesktopCategoryDashboardPage: FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const [categoriesData] = useApiCategoriesQuery();

  const categories = categoriesData?.items ?? [];
  const categoryCount = categories.length;

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
        <CategoriesListHeader
          categoryCount={categoryCount}
          searchValue={searchQuery}
          onSearchChange={handleSearchChange}
        />
        <CategoriesList searchQuery={searchQuery} onSearchChange={handleSearchChange} />
      </Tile>
    </PageLayout>
  );
};
