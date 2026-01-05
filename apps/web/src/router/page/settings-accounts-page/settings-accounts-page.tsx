import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiAccountsInfiniteQuery } from "@/hooks/use-api";
import { useAccountFilter } from "@/hooks/use-filter-state";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { AccountModel } from "@/types/schemas";
import { AccountCard } from "@/ui/account-card";
import { AccountFilterFields } from "@/ui/account-filter-fields";
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

const SettingsAccountPage = () => {
  const { openDrawer } = useDrawerProvider();

  const filters = useAccountFilter({ adapter: "url" });
  const [
    accounts,
    ,
    { isInitialFetching, isFetchingNextPage, hasNextPage },
    { fetchNextPage },
  ] = useApiAccountsInfiniteQuery({
    sortBy: "name",
    sortOrder: "asc",
    name: filters.appliedFilters.name,
    type: filters.appliedFilters.type,
    pageSize: 15,
  });

  const handleOpenDrawer = () => {
    openDrawer(DRAWER_ROUTES.ACCOUNT_CREATE);
  };

  const handleAccountClick = (account: AccountModel) => {
    openDrawer(DRAWER_ROUTES.ACCOUNT_VIEW, { accountId: account.id });
  };

  return (
    <PageLayout>
      <PageLayout.HeaderRegion>
        <PageHeader
          title="Accounts"
          subtitle="Manage your accounts"
          size="wide"
        />
      </PageLayout.HeaderRegion>
      <PageLayout.ContentRegion>
        <PageContent size="wide">
          <AccountFilterFields control={filters} />

          <When condition={isInitialFetching}>
            <PageLoader />
          </When>

          <When condition={!isInitialFetching}>
            <When condition={accounts}>
              <ul className="mb-4">
                {accounts?.map((account) => (
                  <li key={account.id} className="border-b border-border">
                    <AccountCard
                      account={account}
                      onClick={handleAccountClick}
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
            <When condition={!accounts?.length}>
              <NoResults
                icon={SearchXIcon}
                title="No accounts yet"
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

export default SettingsAccountPage;
