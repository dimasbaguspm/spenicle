import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { TransactionModel } from "@/types/schemas";
import { TransactionCard } from "@/ui/transaction-card";
import {
  Button,
  ButtonGroup,
  ButtonIcon,
  Drawer,
  Hr,
  NoResults,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { SearchXIcon, XIcon } from "lucide-react";
import { FC } from "react";

export const TransactionsAllTheTimeDrawer: FC = () => {
  const { openDrawer, closeDrawer } = useDrawerProvider();
  const [
    transactions,
    ,
    { isInitialFetching, isFetchingNextPage, hasNextPage },
    { fetchNextPage },
  ] = useApiTransactionsInfiniteQuery({
    sortBy: "date",
    sortOrder: "desc",
    pageSize: 15,
  });

  const handleOnTransactionClick = (transaction: TransactionModel) => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_VIEW, {
      transactionId: transaction.id,
    });
  };
  return (
    <>
      <Drawer.Header>
        <Drawer.Title>All The Time Transactions</Drawer.Title>
        <ButtonIcon
          as={XIcon}
          size="sm"
          variant="ghost"
          aria-label="Close"
          onClick={closeDrawer}
        />
      </Drawer.Header>
      <Drawer.Body>
        <When condition={isInitialFetching}>
          <PageLoader />
        </When>
        <When condition={!isInitialFetching}>
          <When condition={transactions.length === 0}>
            <NoResults
              icon={SearchXIcon}
              title="No Transactions Found"
              subtitle="You have no transactions recorded yet."
            />
          </When>
          <When condition={transactions.length > 0}>
            <ul className="mb-4">
              {transactions.map((transaction) => (
                <li key={transaction.id}>
                  <TransactionCard
                    transaction={transaction}
                    useDateTime
                    onClick={handleOnTransactionClick}
                  />
                  <Hr />
                </li>
              ))}
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
        </When>
      </Drawer.Body>
    </>
  );
};
