import { AppBar } from '@dimasbaguspm/versaur/layouts';
import { ButtonFloat, Icon, Text } from '@dimasbaguspm/versaur/primitive';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useState, type FC } from 'react';

import { BackButton } from '../../../components';
import { useApiCategoriesQuery } from '../../../hooks';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';
import type { Category } from '../../../types/api';
import {
  MobileCategoryInsightsWidget,
  MobileCategorySummarySection,
  type PeriodType,
} from '../components/mobile-category-widgets';

export const MobileCategoryDashboardPage: FC = () => {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const [categoriesData] = useApiCategoriesQuery({ pageSize: 1000 });
  const { openDrawer } = useDrawerRouterProvider();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');

  const categories = categoriesData?.items ?? [];

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

  const handleAddCategory = async () => {
    await openDrawer('add-category');
  };

  const handleCategoryCardClick = async (category: Category) => {
    await openDrawer('edit-category', { categoryId: category.id });
  };

  return (
    <div className="relative mx-4">
      <AppBar>
        <AppBar.Trailing>
          <BackButton />
        </AppBar.Trailing>
        <AppBar.Center>
          <AppBar.Headline>
            <Text as="h1" fontSize="lg" fontWeight="bold">
              Categories
            </Text>
          </AppBar.Headline>
        </AppBar.Center>
      </AppBar>

      <div className="space-y-4">
        {/* category insights widget - key metrics at a glance */}
        <MobileCategoryInsightsWidget
          categories={categories}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        {/* enhanced category summary with integrated search and mobile-optimized layout */}
        <MobileCategorySummarySection
          categories={categories}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onCategoryCardClick={handleCategoryCardClick}
          selectedPeriod={selectedPeriod}
        />
      </div>

      <ButtonFloat offset="5rem" size="sm" onClick={handleAddCategory}>
        <Icon as={Plus} size="lg" color="neutral" />
      </ButtonFloat>
    </div>
  );
};
