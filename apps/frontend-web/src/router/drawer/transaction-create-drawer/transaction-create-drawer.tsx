import {
  Button,
  ButtonGroup,
  ButtonIcon,
  Drawer,
  PageLoader,
  useDesktopBreakpoint,
  useSnackbars,
} from "@dimasbaguspm/versaur";
import type { FC } from "react";

import { Form, formId, type FormRef } from "./form";
import type { TransactionCreateFormSchema } from "./types";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useWebAPIProvider } from "@/providers/web-api-provider";
import {
  useApiAccountQuery,
  useApiCategoryQuery,
  useApiCreateTransaction,
} from "@/hooks/use-api";
import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useParams } from "react-router";
import dayjs from "dayjs";
import { extractDateTimeFromParams, formatDefaultValues } from "./helpers";
import { When } from "@/lib/when";
import { TextSearchIcon } from "lucide-react";
import { useRef } from "react";

interface TransactionCreateDrawerProps {
  payload?: Record<string, string>;
}

export const TransactionCreateDrawer: FC<TransactionCreateDrawerProps> = ({
  payload,
}) => {
  const params = useParams();
  const { closeDrawer, openDrawer } = useDrawerProvider();
  const { showSnack } = useSnackbars();
  const { geolocation } = useWebAPIProvider();
  const isDesktop = useDesktopBreakpoint();
  const formRef = useRef<FormRef>(null);

  const defaultValues = formatDefaultValues({
    ...payload,
    ...extractDateTimeFromParams(params),
  });

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

  const [createTransaction, , { isPending }] = useApiCreateTransaction();

  const handleOnValidSubmit = async (data: TransactionCreateFormSchema) => {
    let date = dayjs(data.date);

    // parse hour and minute from the time string and coerce to numbers
    const [hourStr = "0", minuteStr = "0"] = (data.time ?? "").split(":");
    const hour = Number.parseInt(hourStr, 10) || 0;
    const minute = Number.parseInt(minuteStr, 10) || 0;

    date = date.set("hour", hour).set("minute", minute);

    const coords = geolocation.getCoordinates();

    await createTransaction({
      type: data.type,
      date: date.toISOString(),
      accountId: data.accountId,
      destinationAccountId:
        data.type === "transfer" ? data.destinationAccountId : undefined,
      categoryId: data.categoryId,
      amount: data.amount,
      note: data.notes,
      ...coords,
    });
    showSnack("success", "Transaction created successfully");
    closeDrawer();
  };

  const handleFindNearby = (currentFormState: Record<string, unknown>) => {
    const coords = geolocation.getCoordinates();

    if (!coords?.latitude || !coords?.longitude) {
      showSnack("danger", "Location not available");
      return;
    }
    const filterState: Record<string, unknown> = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      radiusMeters: 1000,
    };

    const categoryId = currentFormState.categoryId;
    if (categoryId && typeof categoryId === "number") {
      filterState.categoryIds = [categoryId];
    }

    const accountId = currentFormState.accountId;
    if (accountId && typeof accountId === "number") {
      filterState.accountIds = [accountId];
    }

    const amount = currentFormState.amount;
    if (amount && typeof amount === "number" && amount > 0) {
      const minAmount = Math.floor(amount * 0.9);
      const maxAmount = Math.ceil(amount * 1.1);
      filterState.minAmount = minAmount;
      filterState.maxAmount = maxAmount;
    }

    openDrawer(
      DRAWER_ROUTES.SELECT_SINGLE_TRANSACTION,
      { payloadId: "transactionId" },
      {
        replace: true,
        state: {
          payload: currentFormState,
          returnToDrawer: DRAWER_ROUTES.TRANSACTION_CREATE,
          returnToDrawerId: null,
          filterState,
        },
      },
    );
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Create Transaction</Drawer.Title>
        <ButtonGroup>
          <ButtonIcon
            as={TextSearchIcon}
            size="sm"
            variant="ghost"
            aria-label="Find Nearby"
            onClick={() =>
              handleFindNearby(formRef.current?.getCurrentFormState() || {})
            }
            title="Find nearby transactions to suggest values"
          />
          <Drawer.CloseButton />
        </ButtonGroup>
      </Drawer.Header>
      <When condition={isDependenciesDataPending}>
        <PageLoader />
      </When>
      <When condition={!isDependenciesDataPending}>
        <Drawer.Body>
          <Form
            ref={formRef}
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
