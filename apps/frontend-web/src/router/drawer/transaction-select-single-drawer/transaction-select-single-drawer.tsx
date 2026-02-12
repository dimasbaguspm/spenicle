import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { TransactionCard } from "@/ui/transaction-card";
import {
  Button,
  ButtonGroup,
  ButtonIcon,
  Drawer,
  NoResults,
  PageLoader,
  SelectableSingleInput,
  useDesktopBreakpoint,
} from "@dimasbaguspm/versaur";
import { SearchXIcon, XIcon } from "lucide-react";
import { type FC, useState } from "react";

interface TransactionSelectSingleDrawerProps {
  returnToDrawer: string;
  returnToDrawerId?: Record<string, string> | null;
  payload: Record<string, unknown>;
  payloadId: string;
}

interface TransactionFilterState {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  categoryIds?: number[];
  accountIds?: number[];
  minAmount?: number;
  maxAmount?: number;
}

export const TransactionSelectSingleDrawer: FC<
  TransactionSelectSingleDrawerProps
> = ({ returnToDrawer, returnToDrawerId = null, payloadId, payload }) => {
  const isDesktop = useDesktopBreakpoint();
  const { openDrawer, state } = useDrawerProvider<any, any>();

  const [selectedTransactionId, setSelectedTransactionId] = useState<
    number | null
  >(typeof payload?.[payloadId] === "number" ? payload[payloadId] : null);

  const filterState: TransactionFilterState =
    (state?.filterState as TransactionFilterState) || {
      radiusMeters: 1000,
    };

  const [
    transactions,
    ,
    { isInitialFetching, isFetchingNextPage, hasNextPage },
    { fetchNextPage },
  ] = useApiTransactionsInfiniteQuery({
    latitude: filterState.latitude,
    longitude: filterState.longitude,
    radiusMeters: filterState.radiusMeters,
    categoryId: filterState.categoryIds,
    accountId: filterState.accountIds,
    minAmount: filterState.minAmount,
    maxAmount: filterState.maxAmount,
    sortBy: "date",
    sortOrder: "desc",
    pageSize: 25,
  });

  const handleOnSubmit = () => {
    const selectedTransaction = transactions.find(
      (tx) => tx.id === selectedTransactionId,
    );

    if (!selectedTransaction) {
      return;
    }

    openDrawer(returnToDrawer, returnToDrawerId, {
      replace: true,
      state: {
        payload: {
          ...payload,
          categoryId: selectedTransaction.category.id,
          type: selectedTransaction.type,
          notes: selectedTransaction.note,
          amount: selectedTransaction.amount,
          accountId: selectedTransaction.account.id,
        },
      },
    });
  };

  const handleOnCancel = () => {
    openDrawer(returnToDrawer, returnToDrawerId, {
      replace: true,
      state: {
        payload,
      },
    });
  };

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>Select Transaction</Drawer.Title>
        <ButtonIcon
          as={XIcon}
          size="sm"
          variant="ghost"
          aria-label="Close"
          onClick={handleOnCancel}
        />
      </Drawer.Header>

      <Drawer.Body>
        <When condition={isInitialFetching}>
          <PageLoader />
        </When>

        <When condition={!isInitialFetching}>
          <When condition={transactions.length}>
            <ul className="mb-4">
              {transactions?.map((transaction) => {
                return (
                  <li key={transaction.id}>
                    <SelectableSingleInput
                      value={transaction.id.toString()}
                      checked={transaction.id === selectedTransactionId}
                      onChange={() => setSelectedTransactionId(transaction.id)}
                      checkboxPlacement="top"
                    >
                      <TransactionCard
                        as="div"
                        size="none"
                        transaction={transaction}
                        onClick={() => setSelectedTransactionId(transaction.id)}
                        useDateTime={true}
                        hideNotesSubtitle={false}
                      />
                    </SelectableSingleInput>
                  </li>
                );
              })}
            </ul>
            <When condition={hasNextPage}>
              <ButtonGroup alignment="center">
                <Button
                  onClick={() => fetchNextPage()}
                  variant="outline"
                  disabled={isFetchingNextPage}
                >
                  Load More
                </Button>
              </ButtonGroup>
            </When>
          </When>
          <When condition={!transactions.length}>
            <NoResults
              icon={SearchXIcon}
              title="No transactions found"
              subtitle="Try adjusting your filters"
            />
          </When>
        </When>
      </Drawer.Body>

      <Drawer.Footer>
        <ButtonGroup alignment="end" fluid={!isDesktop}>
          <Button variant="ghost" onClick={handleOnCancel}>
            Cancel
          </Button>
          <Button onClick={handleOnSubmit} disabled={!selectedTransactionId}>
            Select
          </Button>
        </ButtonGroup>
      </Drawer.Footer>
    </>
  );
};
