import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { TransactionModel } from "@/types/schemas";
import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { NoResults, PageContent, PageLoader } from "@dimasbaguspm/versaur";
import { useTransactionFilter } from "@/hooks/use-filter-state";
import { TransactionsViewTable } from "./components/transactions-view-table";

import { useCallback, useMemo } from "react";
import type { TableColumn } from "@/ui/transactions-virtual-table-base";
import { uniqBy } from "lodash";
import { When } from "@/lib/when";
import { SearchXIcon } from "lucide-react";

const VIEW_MODE_COLUMNS: TableColumn[] = [
  { key: "date", label: "Date", width: 120, align: "left" as const },
  { key: "time", label: "Time", width: 80, align: "left" as const },
  { key: "type", label: "Type", width: 100, align: "left" as const },
  { key: "account", label: "Account", width: 200, align: "left" as const },
  {
    key: "destinationAccount",
    label: "To Account",
    width: 200,
    align: "left" as const,
  },
  { key: "category", label: "Category", width: 180, align: "left" as const },
  { key: "amount", label: "Amount", width: 140, align: "left" as const },
  { key: "notes", label: "Notes", width: 300, align: "left" as const },
];

const TransactionsGridPage = () => {
  const { openDrawer } = useDrawerProvider();
  const filters = useTransactionFilter({ adapter: "url" });

  const [
    transactions,
    ,
    { isPending, hasNextPage, isFetchingNextPage },
    { fetchNextPage },
  ] = useApiTransactionsInfiniteQuery({
    pageSize: 100,
    sortBy: "date",
    sortOrder: "desc",
    type: filters.appliedFilters.type,
  });

  const uniqueTransactions = useMemo(
    () => uniqBy(transactions, "id"),
    [transactions],
  );

  const handleOnTransactionClick = useCallback(
    (transaction: TransactionModel) => {
      openDrawer(DRAWER_ROUTES.TRANSACTION_VIEW, {
        transactionId: transaction.id,
      });
    },
    [openDrawer],
  );

  return (
    <PageContent
      size="wide"
      className="p-0 overflow-hidden grid grid-rows-[auto_1fr]"
    >
      <When condition={isPending}>
        <PageLoader />
      </When>
      <When condition={!isPending}>
        <When condition={!uniqueTransactions.length}>
          <NoResults
            icon={SearchXIcon}
            title="No transactions found"
            subtitle="Try adjusting your filters or add a new transaction."
          />
        </When>
        <When condition={uniqueTransactions.length}>
          <div className="grid h-[calc(100dvh-200px)] h-max-screen min-h-0 grid-rows-1">
            <div className="min-h-0 overflow-hidden">
              <TransactionsViewTable
                transactions={uniqueTransactions}
                columns={VIEW_MODE_COLUMNS}
                onTransactionClick={handleOnTransactionClick}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onFetchNextPage={fetchNextPage}
              />
            </div>
          </div>
        </When>
      </When>
    </PageContent>
  );
};

export default TransactionsGridPage;
