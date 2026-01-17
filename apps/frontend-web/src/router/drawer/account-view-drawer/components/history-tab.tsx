import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { useTransactionFilter } from "@/hooks/use-filter-state";
import { DateFormat, formatDate } from "@/lib/format-date";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { AccountModel, TransactionModel } from "@/types/schemas";
import { TransactionCard } from "@/ui/transaction-card";
import { TransactionFilterFields } from "@/ui/transaction-filter-fields";
import {
  Button,
  ButtonGroup,
  Hr,
  NoResults,
  PageLoader,
} from "@dimasbaguspm/versaur";
import dayjs from "dayjs";
import { SearchXIcon } from "lucide-react";
import type { FC } from "react";

interface HistoryTabProps {
  data: AccountModel;
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
    accountId: [data.id],
    startDate: filters.appliedFilters.startDate
      ? formatDate(
          dayjs(filters.appliedFilters.startDate).startOf("day"),
          DateFormat.ISO_DATETIME,
        )
      : undefined,
    endDate: filters.appliedFilters.endDate
      ? formatDate(
          dayjs(filters.appliedFilters.endDate).endOf("day"),
          DateFormat.ISO_DATETIME,
        )
      : undefined,
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
