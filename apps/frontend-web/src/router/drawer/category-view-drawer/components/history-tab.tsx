import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { useTransactionFilter } from "@/hooks/use-filter-state";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { CategoryModel, TransactionModel } from "@/types/schemas";
import { TransactionCard } from "@/ui/transaction-card/transaction-card";
import { TransactionFilterFields } from "@/ui/transaction-filter-fields";
import {
  Button,
  ButtonGroup,
  NoResults,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { SearchXIcon } from "lucide-react";
import type { FC } from "react";

interface HistoryTabProps {
  data: CategoryModel;
}

export const HistoryTab: FC<HistoryTabProps> = ({ data }) => {
  const { openDrawer } = useDrawerProvider();

  const filters = useTransactionFilter({ adapter: "state" });
  const [
    transactions,
    ,
    { hasNextPage, isLoading, isFetchingNextPage },
    { fetchNextPage },
  ] = useApiTransactionsInfiniteQuery({
    pageSize: 15,
    sortBy: "date",
    categoryIds: [data.id],
    startDate: filters.appliedFilters.startDate,
    endDate: filters.appliedFilters.endDate,
    type: filters.appliedFilters.type,
  });

  const handleOnTransactionClick = (transaction: TransactionModel) => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_VIEW, {
      transactionId: transaction.id,
    });
  };

  return (
    <>
      <TransactionFilterFields control={filters} />
      <When condition={[isLoading]}>
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
              <li key={transaction.id} className="border-b border-border">
                <TransactionCard
                  transaction={transaction}
                  onClick={handleOnTransactionClick}
                  useDateTime
                />
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
