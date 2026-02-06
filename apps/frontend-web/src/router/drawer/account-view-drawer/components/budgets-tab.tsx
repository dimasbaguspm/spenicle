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
import {
  useApiBudgetsPaginatedQuery,
  useApiRelatedBudgetsInfiniteQuery,
} from "@/hooks/use-api";
import { BudgetCard, BudgetTemplateCard } from "@/ui/budget-card";
import type { AccountModel, BudgetModel } from "@/types/schemas";

interface BudgetsTabProps {
  data: AccountModel;
}

export const BudgetsTab: FC<BudgetsTabProps> = ({ data }) => {
  const { openDrawer } = useDrawerProvider();

  const [templateResult, , { isPending: isTemplateLoading }] =
    useApiBudgetsPaginatedQuery(
      { accountId: [data.id] },
      { enabled: !!data.id },
    );

  const template = templateResult?.items?.[0] ?? null;

  const [
    relatedBudgets,
    ,
    {
      isPending: isRelatedLoading,
      hasNextPage,
      isFetchingNextPage,
    },
    { fetchNextPage },
  ] = useApiRelatedBudgetsInfiniteQuery(
    template?.id ?? 0,
    {},
    { enabled: !!template?.id },
  );

  const isLoading = isTemplateLoading;

  const handleCreateBudgetClick = () => {
    openDrawer(DRAWER_ROUTES.BUDGET_CREATE, { accountId: data.id });
  };

  const handleEditBudgetClick = () => {
    if (template) {
      openDrawer(DRAWER_ROUTES.BUDGET_UPDATE, { budgetId: template.id });
    }
  };

  const handleGeneratedBudgetClick = (budget: BudgetModel, templateId?: number) => {
    if (!templateId) return;
    openDrawer(DRAWER_ROUTES.BUDGET_GENERATED_UPDATE, {
      templateId,
      budgetId: budget.id,
    });
  };

  return (
    <>
      <When condition={isLoading}>
        <PageLoader />
      </When>

      <When condition={!isLoading}>
        <When condition={!template}>
          <NoResults
            icon={SearchXIcon}
            title="No Budget Template"
            subtitle="Create a budget template to manage your spending effectively."
            action={
              <Button onClick={handleCreateBudgetClick} variant="outline">
                <Icon as={PlusIcon} size="sm" color="inherit" />
                Create Budget
              </Button>
            }
          />
        </When>

        <When condition={!!template}>
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Budget Template
            </h3>
            <BudgetTemplateCard
              budget={template!}
              onClick={handleEditBudgetClick}
            />
          </div>

          <Hr />

          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Generated Budgets
            </h3>

            <When condition={isRelatedLoading}>
              <PageLoader />
            </When>

            <When condition={!isRelatedLoading && relatedBudgets.length === 0}>
              <p className="text-sm text-muted-foreground">
                No budgets generated yet. The worker will create budgets based on
                your template schedule.
              </p>
            </When>

            <When condition={!isRelatedLoading && relatedBudgets.length > 0}>
              <ul className="mb-4">
                {relatedBudgets.map((budget) => (
                  <li key={budget.id}>
                    <BudgetCard
                      budget={budget}
                      templateId={template?.id}
                      onClick={handleGeneratedBudgetClick}
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
          </div>
        </When>
      </When>
    </>
  );
};
