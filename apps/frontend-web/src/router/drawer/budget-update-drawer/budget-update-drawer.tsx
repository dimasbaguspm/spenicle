import {
  Badge,
  Button,
  ButtonGroup,
  Drawer,
  NoResults,
  PageLoader,
  useDesktopBreakpoint,
  useSnackbars,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";

import { Form, formId } from "./form";
import type { BudgetUpdateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useApiBudgetQuery, useApiUpdateBudget } from "@/hooks/use-api";
import { When } from "@/lib/when";
import { formatBudgetTemplateData } from "@/lib/format-data";
import { SearchXIcon } from "lucide-react";

interface BudgetUpdateDrawerProps {
  budgetId: number;
}

export const BudgetUpdateDrawer: FC<BudgetUpdateDrawerProps> = ({
  budgetId,
}) => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const [budgetData, , { isPending: isBudgetLoading }] =
    useApiBudgetQuery(budgetId);
  const [updateBudget, , { isPending }] = useApiUpdateBudget();

  const templateInfo = formatBudgetTemplateData(budgetData ?? null);

  const handleOnValidSubmit = async (data: BudgetUpdateFormSchema) => {
    await updateBudget({
      id: budgetId,
      name: data.name || undefined,
      note: data.note || undefined,
      active: data.active,
    });
    showSnack("success", "Budget updated successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>
          Update Budget
          {budgetData?.name && ` - ${budgetData.name}`}
        </Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <When condition={isBudgetLoading}>
        <Drawer.Body>
          <PageLoader />
        </Drawer.Body>
      </When>
      <When condition={!isBudgetLoading}>
        <When condition={!budgetData}>
          <NoResults
            title="Budget not found"
            subtitle="The budget you are trying to update does not exist."
            icon={SearchXIcon}
          />
        </When>
        <When condition={!!budgetData}>
          <Drawer.Body>
            <div className="mb-4 space-y-2 rounded-lg bg-gray-50 p-3 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Amount Limit</span>
                <span className="font-medium text-foreground">
                  {templateInfo.formattedAmountLimit}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Recurrence</span>
                <span className="capitalize font-medium text-foreground">
                  {templateInfo.recurrence}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Start Date</span>
                <span className="font-medium text-foreground">
                  {templateInfo.startDate}
                </span>
              </div>
              <When condition={!!templateInfo.endDate}>
                <div className="flex justify-between">
                  <span>End Date</span>
                  <span className="font-medium text-foreground">
                    {templateInfo.endDate}
                  </span>
                </div>
              </When>
              <div className="flex justify-between">
                <span>Status</span>
                <Badge color={templateInfo.activeBadgeColor}>
                  {templateInfo.activeText}
                </Badge>
              </div>
            </div>
            <Form
              handleOnValidSubmit={handleOnValidSubmit}
              defaultValues={{
                name: budgetData?.name,
                note: budgetData?.note || "",
                active: budgetData?.active ?? true,
              }}
            />
          </Drawer.Body>
          <Drawer.Footer>
            <ButtonGroup alignment="end" fluid={!isDesktop}>
              <Button variant="ghost" onClick={closeDrawer}>
                Cancel
              </Button>
              <Button type="submit" form={formId} disabled={isPending}>
                Update
              </Button>
            </ButtonGroup>
          </Drawer.Footer>
        </When>
      </When>
    </>
  );
};
