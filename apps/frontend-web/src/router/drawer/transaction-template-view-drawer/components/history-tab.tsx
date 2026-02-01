import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { TransactionModel, TransactionTemplateModel } from "@/types/schemas";
import { TransactionCard } from "@/ui/transaction-card";
import {
  Button,
  ButtonGroup,
  Hr,
  NoResults,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { SearchXIcon } from "lucide-react";
import { FC } from "react";

interface HistoryTabProps {
  data: TransactionTemplateModel;
}

export const HistoryTab: FC<HistoryTabProps> = ({ data }) => {
  const { openDrawer } = useDrawerProvider();

  const [
    transactions,
    ,
    { hasNextPage, isLoading, isFetchingNextPage },
    { fetchNextPage },
  ] = useApiTransactionsInfiniteQuery({
    templateId: [data.id],
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
      <When condition={!isLoading}>
        <When condition={transactions.length === 0}>
          <NoResults
            icon={SearchXIcon}
            title="No Transactions Found"
            subtitle="There are no transactions associated with this template yet."
          />
        </When>
        <When condition={transactions.length > 0}>
          <ul className="mb-4">
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <TransactionCard
                  transaction={transaction}
                  onClick={handleOnTransactionClick}
                  useDateTime
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
                Load More
              </Button>
            </ButtonGroup>
          </When>
        </When>
      </When>
    </>
  );
};
