import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { DateFormat, formatDate } from "@/lib/format-date";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { TransactionModel } from "@/types/schemas";
import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import {
  Button,
  ButtonGroup,
  Icon,
  NoResults,
  PageContent,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { When } from "@/lib/when";
import { PlusIcon, SearchXIcon } from "lucide-react";
import { TransactionCard } from "@/ui/transaction-card";
import { useTransactionFilter } from "@/hooks/use-filter-state";
import dayjs from "dayjs";

const TransactionsGridPage = () => {
  const { openDrawer } = useDrawerProvider();

  // Grid view always shows today's transactions
  const startDate = dayjs();

  const filters = useTransactionFilter({ adapter: "url" });

  // NOTE: Basic implementation without infinite scroll
  // TODO: Replace with virtual scroll (react-window or @tanstack/react-virtual)
  const [transactions, , { isLoading }] = useApiTransactionsInfiniteQuery({
    startDate: formatDate(startDate.startOf("day"), DateFormat.ISO_DATETIME),
    endDate: formatDate(startDate.endOf("day"), DateFormat.ISO_DATETIME),
    pageSize: 100, // Load more items at once (no pagination for now)
    sortBy: "date",
    sortOrder: "desc",
    type: filters.appliedFilters.type,
  });

  const handleOnNewTransactionClick = () => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_CREATE, undefined, {
      state: {
        payload: {
          date: formatDate(startDate, DateFormat.ISO_DATE),
          time: formatDate(startDate, DateFormat.TIME_24H),
        },
      },
    });
  };

  const handleOnTransactionClick = (transaction: TransactionModel) => {
    openDrawer(DRAWER_ROUTES.TRANSACTION_VIEW, {
      transactionId: transaction.id,
    });
  };

  return (
    <PageContent size="wide" className="min-h-[calc(100dvh-25dvh)]">
      <When condition={isLoading}>
        <PageLoader />
      </When>

      <When condition={!isLoading}>
        <When condition={!transactions.length}>
          <NoResults
            title="No Transactions"
            subtitle="You have no transactions today."
            icon={SearchXIcon}
            action={
              <ButtonGroup alignment="center">
                <Button onClick={handleOnNewTransactionClick} variant="outline">
                  <Icon as={PlusIcon} color="inherit" />
                  Add Transaction
                </Button>
              </ButtonGroup>
            }
          />
        </When>

        <When condition={!!transactions.length}>
          {/*
            TODO: Replace with virtual scroll implementation
            - Use @tanstack/react-virtual or react-window
            - Virtualize rows with dynamic heights
            - Keep grid responsive layout
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="border border-border rounded-lg"
              >
                <TransactionCard
                  transaction={transaction}
                  onClick={handleOnTransactionClick}
                />
              </div>
            ))}
          </div>
        </When>
      </When>
    </PageContent>
  );
};

export default TransactionsGridPage;
