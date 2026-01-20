import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiTransactionTemplatesInfiniteQuery } from "@/hooks/use-api";
import { useTransactionTemplateFilter } from "@/hooks/use-filter-state";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { TransactionTemplateModel } from "@/types/schemas";

import { TransactionTemplateCard } from "@/ui/transaction-template-card";
import { TransactionTemplateFilterFields } from "@/ui/transaction-template-filter-fields";
import {
  Button,
  ButtonGroup,
  NoResults,
  PageContent,
  PageHeader,
  PageLayout,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { SearchXIcon } from "lucide-react";

const SettingsCategoriesPage = () => {
  const { openDrawer } = useDrawerProvider();

  const filters = useTransactionTemplateFilter({ adapter: "url" });

  const [
    templates,
    ,
    { isInitialFetching, isFetchingNextPage, hasNextPage },
    { fetchNextPage },
  ] = useApiTransactionTemplatesInfiniteQuery({
    pageSize: 15,
    name: filters.appliedFilters.name,
    sortBy: "name",
    sortOrder: "asc",
  });

  const handleTemplateClick = (template: TransactionTemplateModel) => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_TEMPLATE_VIEW, {
      transactionTemplateId: template.id,
    });
  };

  return (
    <PageLayout>
      <PageLayout.HeaderRegion>
        <PageHeader
          title="Subscription"
          subtitle="Manage your subscriptions"
          size="wide"
        />
      </PageLayout.HeaderRegion>
      <PageLayout.ContentRegion>
        <PageContent size="wide">
          <TransactionTemplateFilterFields control={filters} />

          <When condition={isInitialFetching}>
            <PageLoader />
          </When>

          <When condition={!isInitialFetching}>
            <When condition={templates}>
              <ul className="mb-4">
                {templates?.map((template) => (
                  <li key={template.id} className="border-b border-border">
                    <TransactionTemplateCard
                      transactionTemplate={template}
                      onClick={handleTemplateClick}
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
            <When condition={!templates?.length}>
              <NoResults
                icon={SearchXIcon}
                title="No templates yet"
                subtitle="Create your first template to start scheduling transactions"
              />
            </When>
          </When>
        </PageContent>
      </PageLayout.ContentRegion>
    </PageLayout>
  );
};

export default SettingsCategoriesPage;
