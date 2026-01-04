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
import type { TransactionCreateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import {
  useApiAccountQuery,
  useApiCategoryQuery,
  useApiCreateTransaction,
} from "@/hooks/use-api";
import { useParams } from "react-router";
import dayjs from "dayjs";
import { extractDateTimeFromParams, formatDefaultValues } from "./helpers";
import { When } from "@/lib/when";

interface TransactionCreateDrawerProps {
  payload?: Record<string, string>;
}

export const TransactionCreateDrawer: FC<TransactionCreateDrawerProps> = ({
  payload,
}) => {
  const params = useParams();
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const defaultValues = formatDefaultValues({
    ...payload,
    ...extractDateTimeFromParams(params),
  });

  const [accountData, , { isPending: isAccountPending }] = useApiAccountQuery(
    defaultValues.accountId,
    {
      enabled: !!defaultValues.accountId,
    }
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

  const [createTransaction, , { isPending }] = useApiCreateTransaction();

  const handleOnValidSubmit = async (data: TransactionCreateFormSchema) => {
    let date = dayjs(data.date);

    // parse hour and minute from the time string and coerce to numbers
    const [hourStr = "0", minuteStr = "0"] = (data.time ?? "").split(":");
    const hour = Number.parseInt(hourStr, 10) || 0;
    const minute = Number.parseInt(minuteStr, 10) || 0;

    date = date.set("hour", hour).set("minute", minute);

    await createTransaction({
      type: data.type,
      date: date.toISOString(),
      accountId: data.accountId,
      destinationAccountId:
        data.type === "transfer" ? data.destinationAccountId : undefined,
      categoryId: data.categoryId,
      amount: data.amount,
      note: data.notes,
    });
    showSnack("success", "Transaction created successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Create Transaction</Drawer.Title>
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
