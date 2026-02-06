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
import { SearchXIcon } from "lucide-react";

import { Form, formId } from "./form";
import type { BudgetGeneratedUpdateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import {
  useApiGeneratedBudgetQuery,
  useApiUpdateGeneratedBudget,
} from "@/hooks/use-api";
import { When } from "@/lib/when";
import { formatBudgetData } from "@/lib/format-data";

interface BudgetGeneratedUpdateDrawerProps {
  templateId: number;
  budgetId: number;
}

export const BudgetGeneratedUpdateDrawer: FC<
  BudgetGeneratedUpdateDrawerProps
> = ({ templateId, budgetId }) => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const [budget, , { isPending: isBudgetLoading }] = useApiGeneratedBudgetQuery(
    templateId,
    budgetId,
    { enabled: !!templateId && !!budgetId },
  );
  const { name } = formatBudgetData(budget);
  const [updateGeneratedBudget, , { isPending }] =
    useApiUpdateGeneratedBudget();

  const handleOnValidSubmit = async (data: BudgetGeneratedUpdateFormSchema) => {
    await updateGeneratedBudget({
      templateId,
      budgetId,
      amountLimit: +data.amountLimit,
    });
    showSnack("success", "Budget updated successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Update {name}</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>

      <When condition={isBudgetLoading}>
        <Drawer.Body>
          <PageLoader />
        </Drawer.Body>
      </When>

      <When condition={!isBudgetLoading}>
        <When condition={!budget}>
          <NoResults
            title="Budget not found"
            subtitle="The budget you are trying to update does not exist."
            icon={SearchXIcon}
          />
        </When>

        <When condition={!!budget}>
          <Drawer.Body>
            <Form
              handleOnValidSubmit={handleOnValidSubmit}
              defaultValues={{
                amountLimit: budget?.amountLimit || 0,
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
