import {
  Button,
  ButtonGroup,
  Drawer,
  useDesktopBreakpoint,
  useSnackbars,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";
import dayjs from "dayjs";

import { Form, formId } from "./form";
import type { BudgetCreateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import {
  useApiCreateBudget,
  useApiAccountQuery,
  useApiCategoryQuery,
} from "@/hooks/use-api";

interface BudgetCreateDrawerProps {
  payload?: Record<string, string>;
  accountId?: number;
  categoryId?: number;
}

export const BudgetCreateDrawer: FC<BudgetCreateDrawerProps> = ({
  payload,
  accountId,
  categoryId,
}) => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const today = dayjs().format("YYYY-MM-DD");

  const defaultValues: Partial<BudgetCreateFormSchema> = {
    name: payload?.name ?? "",
    amountLimit: payload?.amountLimit ? Number(payload.amountLimit) : undefined,
    recurrence:
      (payload?.recurrence as BudgetCreateFormSchema["recurrence"]) ??
      "monthly",
    startDate: payload?.startDate ?? today,
    endDate: payload?.endDate ?? "",
    note: payload?.note ?? "",
    active: true,
  };

  const [accountData] = useApiAccountQuery(accountId!, {
    enabled: !!accountId,
  });
  const [categoryData] = useApiCategoryQuery(categoryId!, {
    enabled: !!categoryId,
  });

  const [createBudget, , { isPending }] = useApiCreateBudget();

  const handleOnValidSubmit = async (data: BudgetCreateFormSchema) => {
    await createBudget({
      name: data.name,
      amountLimit: data.amountLimit,
      recurrence: data.recurrence,
      startDate: dayjs(data.startDate).toISOString(),
      endDate: data.endDate
        ? dayjs(data.endDate).toISOString()
        : undefined,
      accountId: accountId || undefined,
      categoryId: categoryId || undefined,
      note: data.note || undefined,
      active: data.active,
    });
    showSnack("success", "Budget created successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>
          Create Budget
          {accountData?.name && ` for ${accountData.name}`}
          {categoryData?.name && ` for ${categoryData.name}`}
        </Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <Drawer.Body>
        <Form
          handleOnValidSubmit={handleOnValidSubmit}
          defaultValues={defaultValues}
        />
      </Drawer.Body>
      <Drawer.Footer>
        <ButtonGroup alignment="end" fluid={!isDesktop}>
          <Button variant="ghost" onClick={closeDrawer}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isPending}>
            Create
          </Button>
        </ButtonGroup>
      </Drawer.Footer>
    </>
  );
};
