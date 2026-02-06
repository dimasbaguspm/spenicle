import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiCategoryQuery } from "@/hooks/use-api";
import { formatCategoryData } from "@/lib/format-data";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { Drawer, NoResults, PageLoader, Tabs } from "@dimasbaguspm/versaur";
import { SearchXIcon } from "lucide-react";
import type { FC } from "react";
import { BudgetsTab } from "./components/budgets-tab";
import { DetailsTab } from "./components/details-tab";
import { HistoryTab } from "./components/history-tab";
import { StatisticTab } from "./components/statistic-tab";

interface CategoryViewDrawerProps {
  categoryId: number;
  tabId?: string;
}

export const CategoryViewDrawer: FC<CategoryViewDrawerProps> = ({
  categoryId,
  tabId,
}) => {
  const { openDrawer } = useDrawerProvider();
  const activeTab = tabId || "details";
  const [category, , { isPending }] = useApiCategoryQuery(categoryId);

  const { name } = formatCategoryData(category);

  const handleOnTabChange = (tabId: string) => {
    openDrawer(
      DRAWER_ROUTES.CATEGORY_VIEW,
      { categoryId, tabId },
      {
        replace: true,
      },
    );
  };

  return (
    <>
      <Drawer.Header hasTab>
        <Drawer.Title>{isPending ? "Loading..." : name}</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <Drawer.Tab>
        <Tabs value={activeTab} onValueChange={handleOnTabChange}>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="budgets">Budgets</Tabs.Trigger>
          <Tabs.Trigger value="history">History</Tabs.Trigger>
          <Tabs.Trigger value="statistic">Statistic</Tabs.Trigger>
        </Tabs>
      </Drawer.Tab>

      <When condition={isPending}>
        <PageLoader />
      </When>
      <When condition={!isPending}>
        <Drawer.Body>
          <When condition={!category}>
            <NoResults
              title="No Category Found"
              subtitle="The category you are looking does not exist."
              icon={SearchXIcon}
            />
          </When>
          <When condition={!!category}>
            {activeTab === "details" && <DetailsTab data={category!} />}
            {activeTab === "budgets" && <BudgetsTab data={category!} />}
            {activeTab === "history" && <HistoryTab data={category!} />}
            {activeTab === "statistic" && <StatisticTab data={category!} />}
          </When>
        </Drawer.Body>
      </When>
    </>
  );
};
