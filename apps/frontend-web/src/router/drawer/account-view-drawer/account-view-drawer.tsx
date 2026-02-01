import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiAccountQuery } from "@/hooks/use-api";
import { formatAccountData } from "@/lib/format-data";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { Drawer, NoResults, PageLoader, Tabs } from "@dimasbaguspm/versaur";
import { SearchXIcon } from "lucide-react";
import type { FC } from "react";
import { DetailsTab } from "./components/details-tab";
import { HistoryTab } from "./components/history-tab";
import { StatisticTab } from "./components/statistic-tab";

interface AccountViewDrawerProps {
  accountId: number;
  tabId?: string;
}

export const AccountViewDrawer: FC<AccountViewDrawerProps> = ({
  accountId,
  tabId,
}) => {
  const { openDrawer } = useDrawerProvider();
  const activeTab = tabId || "details";

  const [account, , { isLoading }] = useApiAccountQuery(accountId);

  const { name } = formatAccountData(account);

  const handleOnTabChange = (tabId: string) => {
    openDrawer(
      DRAWER_ROUTES.ACCOUNT_VIEW,
      { accountId, tabId },
      {
        replace: true,
      },
    );
  };

  return (
    <>
      <Drawer.Header hasTab>
        <Drawer.Title>{isLoading ? "Loading..." : name}</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <Drawer.Tab>
        <Tabs value={activeTab} onValueChange={handleOnTabChange}>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="history">History</Tabs.Trigger>
          <Tabs.Trigger value="statistic">Statistic</Tabs.Trigger>
        </Tabs>
      </Drawer.Tab>

      <When condition={isLoading}>
        <PageLoader />
      </When>

      <When condition={!isLoading}>
        <Drawer.Body>
          <When condition={!!account}>
            {activeTab === "details" && <DetailsTab data={account!} />}
            {activeTab === "history" && <HistoryTab data={account!} />}
            {activeTab === "statistic" && <StatisticTab data={account!} />}
          </When>
          <When condition={!account}>
            <NoResults
              title="Account not found"
              subtitle="The account you are looking for does not exist"
              icon={SearchXIcon}
            />
          </When>
        </Drawer.Body>
      </When>
    </>
  );
};
