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

const computePeriodDates = (
  periodType: BudgetCreateFormSchema["periodType"],
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

export const BudgetCreateDrawer: FC<BudgetCreateDrawerProps> = ({
  payload,
  accountId,
  categoryId,
}) => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const defaultValues: Partial<BudgetCreateFormSchema> = {
    name: payload?.name ?? "",
    amountLimit: payload?.amountLimit ? Number(payload.amountLimit) : undefined,
    periodType:
      (payload?.periodType as BudgetCreateFormSchema["periodType"]) ??
      "monthly",
    note: payload?.note ?? "",
  };

  const [accountData] = useApiAccountQuery(accountId!, {
    enabled: !!accountId,
  });
  const [categoryData] = useApiCategoryQuery(categoryId!, {
    enabled: !!categoryId,
  });

  const [createBudget, , { isPending }] = useApiCreateBudget();

  const handleOnValidSubmit = async (data: BudgetCreateFormSchema) => {
    const { periodStart, periodEnd } = computePeriodDates(data.periodType);

    await createBudget({
      name: data.name,
      amountLimit: data.amountLimit,
      periodStart,
      periodEnd,
      accountId: accountId || undefined,
      categoryId: categoryId || undefined,
      note: data.note || undefined,
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
