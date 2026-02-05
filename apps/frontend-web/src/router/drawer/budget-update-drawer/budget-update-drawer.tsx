import {
  Button,
  ButtonGroup,
  Drawer,
  NoResults,
  PageLoader,
  useDesktopBreakpoint,
  useSnackbars,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";
import dayjs from "dayjs";

import { Form, formId } from "./form";
import type { BudgetUpdateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useApiBudgetQuery, useApiUpdateBudget } from "@/hooks/use-api";
import { When } from "@/lib/when";
import { SearchXIcon } from "lucide-react";

interface BudgetUpdateDrawerProps {
  budgetId: number;
}

const computeNextPeriodDates = (
  periodType: BudgetUpdateFormSchema["periodType"],
) => {
  const now = dayjs();

  switch (periodType) {
    case "weekly":
      return {
        periodStart: now.startOf("week").toISOString(),
        periodEnd: now.endOf("week").toISOString(),
      };
    case "monthly":
      return {
        periodStart: now.startOf("month").toISOString(),
        periodEnd: now.endOf("month").toISOString(),
      };
    case "yearly":
      return {
        periodStart: now.startOf("year").toISOString(),
        periodEnd: now.endOf("year").toISOString(),
      };
  }
};

export const BudgetUpdateDrawer: FC<BudgetUpdateDrawerProps> = ({
  budgetId,
}) => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const [budgetData, , { isPending: isBudgetLoading }] =
    useApiBudgetQuery(budgetId);
  const [updateBudget, , { isPending }] = useApiUpdateBudget();

  const handleOnValidSubmit = async (data: BudgetUpdateFormSchema) => {
    const { periodStart, periodEnd } = computeNextPeriodDates(data.periodType);

    await updateBudget({
      id: budgetId,
      name: data.name,
      amountLimit: data.amountLimit,
      periodStart,
      periodEnd,
      note: data.note || undefined,
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
            <Form
              handleOnValidSubmit={handleOnValidSubmit}
              defaultValues={{
                name: budgetData?.name,
                amountLimit: budgetData?.amountLimit,
                periodType:
                  budgetData?.periodType as BudgetUpdateFormSchema["periodType"],
                note: budgetData?.note || "",
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
