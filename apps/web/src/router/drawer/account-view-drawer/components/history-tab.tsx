import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { AccountModel, TransactionModel } from "@/types/schemas";
import { TransactionCard } from "@/ui/transaction-card";
import {
  Button,
  ButtonGroup,
  Hr,
  NoResults,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { SearchXIcon } from "lucide-react";
import type { FC } from "react";

interface HistoryTabProps {
  data: AccountModel;
}

export const HistoryTab: FC<HistoryTabProps> = ({ data }) => {
  const { openDrawer } = useDrawerProvider();

  const [
    transactions,
    ,
    { hasNextPage, isLoading, isFetchingNextPage },
    { fetchNextPage },
  ] = useApiTransactionsInfiniteQuery({
    limit: 15,
    orderBy: "date",
    accountId: [data.id],
  });

  const handleOnTransactionClick = (transaction: TransactionModel) => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_VIEW, {
      transactionId: transaction.id,
    });
  };

  return (
    <>
      <When condition={isLoading}>
        <PageLoader />
      </When>

      <When condition={[!isLoading]}>
        <When condition={!transactions.length}>
          <NoResults
            icon={SearchXIcon}
            title="No history available"
            subtitle="Try adjusting your search criteria"
          />
        </When>
        <When condition={[transactions.length]}>
          <ul className="mb-4">
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <TransactionCard
                  transaction={transaction}
                  onClick={handleOnTransactionClick}
                  useDateTime
                  hideAccountSubtitle
                />
                <Hr />
              </li>
            ))}
          </ul>

          <When condition={hasNextPage}>
            <ButtonGroup alignment="center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                Load more
              </Button>
            </ButtonGroup>
          </When>
        </When>
      </When>
    </>
  );
};
