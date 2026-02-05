import {
  Button,
  ButtonGroup,
  Hr,
  Icon,
  NoResults,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { PlusIcon, SearchXIcon } from "lucide-react";
import type { FC } from "react";

import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useApiBudgetsInfiniteQuery } from "@/hooks/use-api";
import { BudgetCard } from "@/ui/budget-card";
import type { AccountModel } from "@/types/schemas";

interface BudgetsTabProps {
  data: AccountModel;
}

export const BudgetsTab: FC<BudgetsTabProps> = ({ data }) => {
  const { openDrawer } = useDrawerProvider();

  const [
    budgets,
    ,
    { isPending: isBudgetsLoading, hasNextPage, isFetchingNextPage },
    { fetchNextPage },
  ] = useApiBudgetsInfiniteQuery(
    {
      accountId: [data.id],
    },
    { enabled: !!data.id },
  );

  const handleCreateBudgetClick = () => {
    openDrawer(DRAWER_ROUTES.BUDGET_CREATE, { accountId: data.id });
  };

  const handleEditBudgetClick = (budgetId: number) => {
    openDrawer(DRAWER_ROUTES.BUDGET_UPDATE, { budgetId });
  };

  return (
    <>
      <When condition={isBudgetsLoading}>
        <PageLoader />
      </When>

      <When condition={!isBudgetsLoading}>
        <When condition={budgets.length === 0}>
          <NoResults
            icon={SearchXIcon}
            title="No Budgets Found"
            subtitle="Create budgets to manage your spending effectively."
            action={
              <Button onClick={handleCreateBudgetClick} variant="outline">
                <Icon as={PlusIcon} size="sm" color="inherit" />
                Create Budget
              </Button>
            }
          />
        </When>

        <When condition={budgets.length > 0}>
          <div className="mb-4">
            <Button onClick={handleCreateBudgetClick} variant="outline">
              <Icon as={PlusIcon} size="sm" color="inherit" />
              Create Budget
            </Button>
          </div>

          <ul className="mb-4">
            {budgets.map((budget) => (
              <li key={budget.id}>
                <BudgetCard
                  budget={budget}
                  onClick={() => handleEditBudgetClick(budget.id)}
                />
                <Hr />
              </li>
            ))}
          </ul>

          <When condition={hasNextPage}>
            <ButtonGroup alignment="center">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outline"
              >
                Load More
              </Button>
            </ButtonGroup>
          </When>
        </When>
      </When>
    </>
  );
};
