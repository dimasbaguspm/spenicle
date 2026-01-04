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
import type { TransactionUpdateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import {
  useApiAccountQuery,
  useApiCategoryQuery,
  useApiCreateTransaction,
  useApiTransactionQuery,
  useApiUpdateTransaction,
} from "@/hooks/use-api";
import { useParams } from "react-router";
import dayjs from "dayjs";
import { extractDateTimeFromParams, formatDefaultValues } from "./helpers";
import { When } from "@/lib/when";
import { SearchXIcon } from "lucide-react";

interface TransactionUpdateDrawerProps {
  transactionId: number;
  payload?: Record<string, string>;
}

export const TransactionUpdateDrawer: FC<TransactionUpdateDrawerProps> = ({
  transactionId,
  payload,
}) => {
  const params = useParams();
  const { closeDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const isDesktop = useDesktopBreakpoint();

  const [transactionData, , { isPending: isTransactionPending }] =
    useApiTransactionQuery(transactionId);

  const defaultValues = formatDefaultValues(transactionData, {
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
    isTransactionPending ||
    isAccountPending ||
    isDestinationAccountPending ||
    isCategoryPending;

  const [updateTransaction, , { isPending }] = useApiUpdateTransaction();

  const handleOnValidSubmit = async (data: TransactionUpdateFormSchema) => {
    let date = dayjs(data.date);

    // parse hour and minute from the time string and coerce to numbers
    const [hourStr = "0", minuteStr = "0"] = (data.time ?? "").split(":");
    const hour = Number.parseInt(hourStr, 10) || 0;
    const minute = Number.parseInt(minuteStr, 10) || 0;

    date = date.set("hour", hour).set("minute", minute);

    await updateTransaction({
      id: transactionId,
      type: data.type,
      date: date.toISOString(),
      accountId: data.accountId,
      destinationAccountId:
        data.type === "transfer" ? data.destinationAccountId : undefined,
      categoryId: data.categoryId,
      amount: data.amount,
      note: data.notes,
    });
    showSnack("success", "Transaction updated successfully");
    closeDrawer();
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Update Transaction</Drawer.Title>
        <Drawer.CloseButton />
      </Drawer.Header>
      <When condition={isDependenciesDataPending}>
        <PageLoader />
      </When>
      <When condition={!isDependenciesDataPending}>
        <When condition={!transactionData}>
          <Drawer.Body>
            <NoResults
              title="Transaction not found"
              subtitle="The transaction you are trying to update does not exist."
              icon={SearchXIcon}
            />
          </Drawer.Body>
        </When>
        <When condition={!!transactionData}>
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
                Update
              </Button>
            </ButtonGroup>
          </Drawer.Footer>
        </When>
      </When>
    </>
  );
};
