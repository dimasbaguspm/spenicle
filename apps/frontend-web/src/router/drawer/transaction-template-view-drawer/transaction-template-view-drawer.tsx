import { useApiTransactionTemplateQuery } from "@/hooks/use-api";
import { formatTransactionTemplateData } from "@/lib/format-data";
import { When } from "@/lib/when";
import { Drawer, NoResults, PageLoader, Tabs } from "@dimasbaguspm/versaur";
import { SearchXIcon } from "lucide-react";
import type { FC } from "react";
import { DetailsTab } from "./components/details-tab";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { HistoryTab } from "./components/history-tab";

interface TransactionTemplateViewDrawerProps {
  transactionTemplateId: number;
  tabId?: string;
}

export const TransactionTemplateViewDrawer: FC<
  TransactionTemplateViewDrawerProps
> = ({ transactionTemplateId, tabId }) => {
  const { openDrawer } = useDrawerProvider();
  const activeTab = tabId || "details";

  const [transactionData, , { isPending }] = useApiTransactionTemplateQuery(
    transactionTemplateId,
  );

  const { name } = formatTransactionTemplateData(transactionData);

  const handleOnTabChange = (tabId: string) => {
    openDrawer(
      DRAWER_ROUTES.TRANSACTION_TEMPLATE_VIEW,
      { transactionTemplateId, tabId },
      {
        replace: true,
      },
    );
  };

  return (
    <>
      <Drawer.Header hasTab>
        <Drawer.Title>Template - {name}</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <Drawer.Tab>
        <Tabs value={activeTab} onValueChange={handleOnTabChange}>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="history">History</Tabs.Trigger>
        </Tabs>
      </Drawer.Tab>
      <When condition={isPending}>
        <PageLoader />
      </When>
      <When condition={!isPending}>
        <When condition={!transactionData}>
          <Drawer.Body>
            <NoResults
              title="No Transaction Template Found"
              subtitle="The transaction template you are looking for does not exist."
              icon={SearchXIcon}
            />
          </Drawer.Body>
        </When>
        <When condition={!!transactionData}>
          <Drawer.Body>
            {activeTab === "details" && <DetailsTab data={transactionData!} />}
            {activeTab === "history" && <HistoryTab data={transactionData!} />}
          </Drawer.Body>
        </When>
      </When>
    </>
  );
};
