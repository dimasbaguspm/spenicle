import { useNavigate, useSearch } from '@tanstack/react-router';
import type { FC } from 'react';

import { PageLayout } from '../../../components';
import { useApiCategoriesQuery } from '../../../hooks';
import { CategoryQuickActionsPanel, EnhancedCategoryTable } from '../components/desktop-category-widgets';

/**
 * DesktopCategoryDashboardPage - Enhanced category analytics dashboard for desktop users.
 *
 * Features:
 * - Comprehensive category overview with period selection (inspired by mobile insights)
 * - Enhanced quick actions panel with category health indicators
 * - Interactive performance charts with multiple period options
 * - Advanced category table with detailed analytics
 * - Sticky sidebar for easy navigation and actions
 *
 * Layout inspired by desktop-account-dashboard-page.tsx with mobile category insights integration.
 */
export const DesktopCategoryDashboardPage: FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const [categoriesData] = useApiCategoriesQuery({ pageSize: 1000 });

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
        {/* enhanced desktop grid layout with better insights */}
        <div className="grid grid-cols-12 gap-6">
          {/* left sidebar: enhanced quick actions with health indicators */}
          <div className="col-span-3 space-y-4 sticky top-6 self-start h-fit max-h-[calc(100vh-12rem)] overflow-y-auto">
            <CategoryQuickActionsPanel onSearchChange={handleSearchChange} searchValue={searchQuery} />
          </div>

          {/* main content area with comprehensive analytics */}
          <div className="col-span-9 space-y-6">
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
