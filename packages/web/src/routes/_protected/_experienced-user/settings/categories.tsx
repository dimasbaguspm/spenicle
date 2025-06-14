import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import { Button, PageLayout, Tile } from '../../../../components';
import { useApiCategoriesQuery } from '../../../../hooks/use-api';
import { CategoriesList, CategoriesListHeader } from '../../../../modules/category-module';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';

export const Route = createFileRoute('/_protected/_experienced-user/settings/categories')({
  component: CategoriesComponent,
});

function CategoriesComponent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const [categoriesData] = useApiCategoriesQuery();
  const { openDrawer } = useDrawerRouterProvider();

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

  const handleAddCategory = async () => {
    await openDrawer('add-category');
  };

  return (
    <PageLayout
      background="cream"
      title="Categories"
      showBackButton={true}
      rightContent={
        <Button variant="coral" size="sm" onClick={handleAddCategory} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Category</span>
          <span className="sm:hidden">Add</span>
        </Button>
      }
    >
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
}
