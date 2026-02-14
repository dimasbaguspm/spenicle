import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { DateFormat, formatDate } from "@/lib/format-date";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { Dayjs } from "dayjs";
import { useNavigate, useOutletContext, useSearchParams } from "react-router";
import { DEEP_PAGE_LINKS } from "@/constant/page-routes";
import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import type { TransactionModel } from "@/types/schemas";
import { useSwipeable } from "react-swipeable";
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
import { ActionsControl } from "./components/actions-control";

interface TransactionsListOutletContext {
  startDate: Dayjs;
}

const TransactionsListPage = () => {
  const { startDate } = useOutletContext<TransactionsListOutletContext>();
  const { openDrawer } = useDrawerProvider();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const filters = useTransactionFilter({ adapter: "url" });
  const [
    transactions,
    ,
    { hasNextPage, isLoading, isFetchingNextPage },
    { fetchNextPage },
  ] = useApiTransactionsInfiniteQuery({
    startDate: formatDate(startDate.startOf("day"), DateFormat.ISO_DATETIME),
    endDate: formatDate(startDate.endOf("day"), DateFormat.ISO_DATETIME),
    pageSize: 15,
    sortBy: "date",
    sortOrder: "desc",
    type: filters.appliedFilters.type,
  });

  // Helper function to navigate while preserving search params
  const navigateWithSearchParams = (path: string) => {
    const currentParams = searchParams.toString();
    const separator = currentParams ? "?" : "";
    navigate(`${path}${separator}${currentParams}`);
  };

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

  const handleOnCalendarDateChange = (date: Dayjs) => {
    navigateWithSearchParams(
      DEEP_PAGE_LINKS.TRANSACTIONS_LIST_DATE.path(
        date.year(),
        date.month(),
        date.date(),
      ),
    );
  };

  const containerHandlers = useSwipeable({
    onSwipedRight: () => {
      const previousDate = startDate.subtract(1, "d");
      navigateWithSearchParams(
        DEEP_PAGE_LINKS.TRANSACTIONS_LIST_DATE.path(
          previousDate.year(),
          previousDate.month(),
          previousDate.date(),
        ),
      );
    },
    onSwipedLeft: () => {
      const nextDate = startDate.add(1, "d");
      navigateWithSearchParams(
        DEEP_PAGE_LINKS.TRANSACTIONS_LIST_DATE.path(
          nextDate.year(),
          nextDate.month(),
          nextDate.date(),
        ),
      );
    },
    trackMouse: false,
  });

  return (
    <PageContent
      {...containerHandlers}
      size="wide"
      className="min-h-[calc(100dvh-25dvh)]"
    >
      <ActionsControl
        date={startDate}
        onDateChange={handleOnCalendarDateChange}
      />
      <When condition={isLoading}>
        <PageLoader />
      </When>
      <When condition={!isLoading}>
        <When condition={!transactions.length}>
          <NoResults
            title="No Transactions"
            subtitle="You have no transactions for this date."
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
          <ul className="flex flex-col mb-4">
            {transactions.map((transaction) => {
              return (
                <li key={transaction.id} className="border-b border-border">
                  <TransactionCard
                    transaction={transaction}
                    onClick={handleOnTransactionClick}
                  />
                </li>
              );
            })}
          </ul>
          <When condition={[hasNextPage]}>
            <ButtonGroup alignment="center">
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                Load More
              </Button>
            </ButtonGroup>
          </When>
        </When>
      </When>
    </PageContent>
  );
};

export default TransactionsListPage;
