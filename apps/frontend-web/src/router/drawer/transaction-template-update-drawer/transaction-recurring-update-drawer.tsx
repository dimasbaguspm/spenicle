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
import type { TransactionTemplateUpdateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import {
  useApiAccountQuery,
  useApiCategoryQuery,
  useApiTransactionTemplateQuery,
  useApiUpdateTransactionTemplate,
} from "@/hooks/use-api";
import { formatDefaultValues } from "./helpers";
import { When } from "@/lib/when";

interface TransactionRecurringUpdateDrawerProps {
  transactionTemplateId: number;
  payload?: Record<string, string>;
}

export const TransactionRecurringUpdateDrawer: FC<
  TransactionRecurringUpdateDrawerProps
> = ({ transactionTemplateId, payload }) => {
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const [templateData, , { isPending: isTemplatePending }] =
    useApiTransactionTemplateQuery(transactionTemplateId);

  const defaultValues = formatDefaultValues(templateData, payload);

  const [accountData, , { isPending: isAccountPending }] = useApiAccountQuery(
    defaultValues.accountId,
    {
      enabled: !!defaultValues.accountId && !isTemplatePending,
    },
  );
  const [destinationAccountData, , { isPending: isDestinationAccountPending }] =
    useApiAccountQuery(defaultValues.destinationAccountId!, {
      enabled: !!defaultValues.destinationAccountId && !isTemplatePending,
    });
  const [categoryData, , { isPending: isCategoryPending }] =
    useApiCategoryQuery(defaultValues.categoryId, {
      enabled: !!defaultValues.categoryId && !isTemplatePending,
    });

  const isDependenciesDataPending =
    isAccountPending || isDestinationAccountPending || isCategoryPending;

  const [updateTemplate, , { isPending }] = useApiUpdateTransactionTemplate();

  const handleOnValidSubmit = async (
    data: TransactionTemplateUpdateFormSchema,
  ) => {
    await updateTemplate({
      templateId: transactionTemplateId,
      name: data.name,
      recurrence: data.recurrence,
      startDate: data.startDate,
      type: data.type,
      accountId: data.accountId,
      destinationAccountId:
        data.type === "transfer" ? data.destinationAccountId : undefined,
      categoryId: data.categoryId,
      amount: data.amount,
      note: data.notes,
    });
    showSnack("success", "Recurring transaction updated successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Update Recurring Transaction</Drawer.Title>
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
              Update
            </Button>
          </ButtonGroup>
        </Drawer.Footer>
      </When>
    </>
  );
};
