import { useNavigate, useSearch } from '@tanstack/react-router';
import type { FC } from 'react';

import { PageLayout } from '../../../components';
import { useApiCategoriesQuery } from '../../../hooks';
import {
  CategoryPerformanceWidget,
  CategoryQuickActionsPanel,
  EnhancedCategoryTable,
} from '../components/desktop-category-widgets';

export const DesktopCategoryDashboardPage: FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const [categoriesData] = useApiCategoriesQuery();

  const categories = categoriesData?.items ?? [];
  const searchQuery = search.search ?? '';

  const handleSearchChange = async (newSearchQuery: string) => {
    await navigate({
      // @ts-expect-error is a bug from tanstack/react-router - search param typing
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        search: newSearchQuery || undefined,
      }),
      replace: true,
    });
  };

  return (
    <PageLayout background="cream" title="Category Analytics" showBackButton>
      <div className="space-y-6">
        {/* desktop grid layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* left sidebar: quick actions and health indicators */}
          <div className="col-span-3 space-y-4 sticky top-6 self-start h-fit max-h-[calc(100vh-12rem)] overflow-y-auto">
            <CategoryQuickActionsPanel onSearchChange={handleSearchChange} searchValue={searchQuery} />
          </div>

          {/* main content area */}
          <div className="col-span-9 space-y-6">
            {/* performance charts */}
            <CategoryPerformanceWidget />

            {/* enhanced category table */}
            <EnhancedCategoryTable
              categories={categories}
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
