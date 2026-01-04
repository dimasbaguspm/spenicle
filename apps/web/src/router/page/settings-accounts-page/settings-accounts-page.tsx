import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiAccountsInfiniteQuery } from "@/hooks/use-api";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { AccountModel } from "@/types/schemas";
import { AccountCard } from "@/ui/account-card";
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

  const [
    accounts,
    ,
    { isInitialFetching, isFetchingNextPage, hasNextPage },
    { fetchNextPage },
  ] = useApiAccountsInfiniteQuery({
    pageSize: 15,
  });

  const handleOpenDrawer = () => {
    openDrawer(DRAWER_ROUTES.ACCOUNT_CREATE);
  };

  const handleAccountClick = (account: AccountModel) => {
    // openDrawer(DRAWER_ROUTES.VIEW_ACCOUNT, { accountId: account.id });
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
