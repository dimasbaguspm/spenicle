import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { useNavigate } from "react-router";
import { NoResults, PageContent, PageLoader } from "@dimasbaguspm/versaur";
import { useTransactionFilter } from "@/hooks/use-filter-state";
import { useCallback } from "react";
import { DEEP_PAGE_LINKS } from "@/constant/page-routes";
import { TransactionsEditFormGuard, TransactionsEditForm } from "./components";
import type { TableColumn } from "@/ui/transactions-virtual-table-base";
import { uniqBy } from "lodash";
import { useMemo } from "react";
import { When } from "@/lib/when";
import { SearchXIcon } from "lucide-react";

const EDIT_MODE_COLUMNS: TableColumn[] = [
  { key: "date", label: "Date", width: 180, align: "left" as const },
  { key: "time", label: "Time", width: 180, align: "left" as const },
  { key: "type", label: "Type", width: 180, align: "left" as const },
  { key: "account", label: "Account", width: 250, align: "left" as const },
  {
    key: "destinationAccount",
    label: "To Account",
    width: 250,
    align: "left" as const,
  },
  { key: "category", label: "Category", width: 250, align: "left" as const },
  { key: "amount", label: "Amount", width: 170, align: "left" as const },
  { key: "notes", label: "Notes", width: 400, align: "left" as const },
];

const TransactionsGridEditPage = () => {
  const navigate = useNavigate();
  const filters = useTransactionFilter({ adapter: "url" });

  const [
    transactions,
    ,
    { isLoading, hasNextPage, isFetchingNextPage },
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

  const handleExitEditMode = useCallback(() => {
    navigate(DEEP_PAGE_LINKS.TRANSACTIONS_GRID.path);
  }, [navigate]);

  return (
    <PageContent
      size="wide"
      className="p-0 overflow-hidden grid grid-rows-[auto_1fr]"
    >
      <When condition={isLoading}>
        <PageLoader />
      </When>
      <When condition={!isLoading}>
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
              <TransactionsEditFormGuard
                transactions={uniqueTransactions}
                onExitEditMode={handleExitEditMode}
              >
                <TransactionsEditForm
                  transactions={uniqueTransactions}
                  columns={EDIT_MODE_COLUMNS}
                  onExitEditMode={handleExitEditMode}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  onFetchNextPage={fetchNextPage}
                />
              </TransactionsEditFormGuard>
            </div>
          </div>
        </When>
      </When>
    </PageContent>
  );
};

export default TransactionsGridEditPage;
