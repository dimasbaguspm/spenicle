import {
  Button,
  ButtonGroup,
  Drawer,
  PageLoader,
  useDesktopBreakpoint,
  useSnackbars,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";

import { Form, formId } from "./form";
import type { TransactionTemplateCreateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import {
  useApiAccountQuery,
  useApiCategoryQuery,
  useApiCreateTransactionTemplate,
} from "@/hooks/use-api";
import { formatDefaultValues } from "./helpers";
import { When } from "@/lib/when";
import { DateFormat, formatDate } from "@/lib/format-date";

interface TransactionRecurringCreateDrawerProps {
  payload?: Record<string, string>;
}

export const TransactionRecurringCreateDrawer: FC<
  TransactionRecurringCreateDrawerProps
> = ({ payload }) => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const defaultValues = formatDefaultValues(payload);

  const [accountData, , { isPending: isAccountPending }] = useApiAccountQuery(
    defaultValues.accountId,
    {
      enabled: !!defaultValues.accountId,
    },
  );
  const [destinationAccountData, , { isPending: isDestinationAccountPending }] =
    useApiAccountQuery(defaultValues.destinationAccountId!, {
      enabled: !!defaultValues.destinationAccountId,
    });
  const [categoryData, , { isPending: isCategoryPending }] =
    useApiCategoryQuery(defaultValues.categoryId, {
      enabled: !!defaultValues.categoryId,
    });

  const isDependenciesDataPending =
    isAccountPending || isDestinationAccountPending || isCategoryPending;

  const [createTemplate, , { isPending }] = useApiCreateTransactionTemplate();

  const handleOnValidSubmit = async (
    data: TransactionTemplateCreateFormSchema,
  ) => {
    await createTemplate({
      name: data.name,
      recurrence: data.recurrence,
      startDate: formatDate(data.startDate, DateFormat.ISO_DATETIME),
      type: data.type,
      accountId: data.accountId,
      destinationAccountId:
        data.type === "transfer" ? data.destinationAccountId : undefined,
      categoryId: data.categoryId,
      amount: data.amount,
      note: data.notes,
    });
    showSnack("success", "Recurring transaction created successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Create Recurring Transaction</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <When condition={isDependenciesDataPending}>
        <PageLoader />
      </When>
      <When condition={!isDependenciesDataPending}>
        <Drawer.Body>
          <Form
            accountData={accountData}
            destinationAccountData={destinationAccountData}
            categoryData={categoryData}
            handleOnValidSubmit={handleOnValidSubmit}
            defaultValues={defaultValues}
            isInstallment={false}
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
      </When>
    </>
  );
};
