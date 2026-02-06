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

import { Form, formId } from "./form";
import type { BudgetUpdateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useApiBudgetQuery, useApiUpdateBudget } from "@/hooks/use-api";
import { When } from "@/lib/when";
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

  const handleOnValidSubmit = async (data: BudgetUpdateFormSchema) => {
    await updateBudget({
      id: budgetId,
      name: data.name || undefined,
      note: data.note || undefined,
      amountLimit: Math.round(data.amountLimit),
      active: data.active,
    });
    showSnack("success", "Budget updated successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Update Budget</Drawer.Title>
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
                amountLimit: budgetData?.amountLimit
                  ? budgetData.amountLimit
                  : 0,
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
