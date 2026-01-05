import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiCategoriesInfiniteQuery } from "@/hooks/use-api";
import { useCategoryFilter } from "@/hooks/use-filter-state";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { CategoryModel } from "@/types/schemas";
import { CategoryCard } from "@/ui/category-card";
import { CategoryFilterFields } from "@/ui/category-filter-fields";
import {
  Button,
  ButtonGroup,
  Icon,
  NoResults,
  PageContent,
  PageHeader,
  PageLayout,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { PlusIcon, SearchXIcon } from "lucide-react";

const SettingsCategoriesPage = () => {
  const { openDrawer } = useDrawerProvider();

  const filters = useCategoryFilter({ adapter: "url" });

  const [
    categories,
    ,
    { isInitialFetching, isFetchingNextPage, hasNextPage },
    { fetchNextPage },
  ] = useApiCategoriesInfiniteQuery({
    pageSize: 15,
    sortBy: "name",
    sortOrder: "asc",
    name: filters.appliedFilters.name,
    type: filters.appliedFilters.type,
  });

  const handleOpenDrawer = () => {
    openDrawer(DRAWER_ROUTES.CATEGORY_CREATE);
  };

  const handleCategoryClick = (category: CategoryModel) => {
    openDrawer(DRAWER_ROUTES.CATEGORY_VIEW, { categoryId: category.id });
  };

  return (
    <PageLayout>
      <PageLayout.HeaderRegion>
        <PageHeader
          title="Categories"
          subtitle="Manage your categories"
          size="wide"
        />
      </PageLayout.HeaderRegion>
      <PageLayout.ContentRegion>
        <PageContent size="wide">
          <CategoryFilterFields control={filters} />

          <When condition={isInitialFetching}>
            <PageLoader />
          </When>

          <When condition={!isInitialFetching}>
            <When condition={categories}>
              <ul className="mb-4">
                {categories?.map((category) => (
                  <li key={category.id} className="border-b border-border">
                    <CategoryCard
                      category={category}
                      onClick={handleCategoryClick}
                    />
                  </li>
                ))}
              </ul>
              <When condition={hasNextPage}>
                <ButtonGroup alignment="center">
                  <Button
                    onClick={() => fetchNextPage()}
                    variant="outline"
                    disabled={isFetchingNextPage}
                  >
                    Load More
                  </Button>
                </ButtonGroup>
              </When>
            </When>
            <When condition={!categories?.length}>
              <NoResults
                icon={SearchXIcon}
                title="No categories yet"
                subtitle="Create your first account"
                action={
                  <ButtonGroup>
                    <Button onClick={handleOpenDrawer} variant="outline">
                      <Icon as={PlusIcon} color="inherit" />
                      Create Account
                    </Button>
                  </ButtonGroup>
                }
              />
            </When>
          </When>
        </PageContent>
      </PageLayout.ContentRegion>
    </PageLayout>
  );
};

export default SettingsCategoriesPage;
