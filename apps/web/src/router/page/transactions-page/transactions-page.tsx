import { useApiTransactionsInfiniteQuery } from "@/hooks/use-api";
import { DateFormat, formatDate } from "@/lib/format-date";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { Dayjs } from "dayjs";
import type { FC } from "react";
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
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
  PageHeader,
  PageLayout,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { When } from "@/lib/when";
import { PlusIcon, SearchXIcon } from "lucide-react";
import { TabsDate } from "./components/tabs-date";
import dayjs from "dayjs";
import { TransactionCard } from "@/ui/transaction-card";

interface TransactionsPageProps {
  startDate: Dayjs;
}

const TransactionsPage: FC<TransactionsPageProps> = ({ startDate }) => {
  const { openDrawer } = useDrawerProvider();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [
    transactions,
    ,
    { hasNextPage, isLoading, isFetchingNextPage },
    { fetchNextPage },
  ] = useApiTransactionsInfiniteQuery({
    // dateFrom: formatDate(startDate.startOf("day"), DateFormat.ISO_DATETIME),
    // dateTo: formatDate(startDate.endOf("day"), DateFormat.ISO_DATETIME),
    limit: 15,
    orderBy: "date",
  });

  // Helper function to navigate while preserving search params
  const navigateWithSearchParams = (path: string) => {
    const currentParams = searchParams.toString();
    const separator = currentParams ? "?" : "";
    navigate(`${path}${separator}${currentParams}`);
  };

  const handleOnDateChange = (date: Dayjs) => {
    navigateWithSearchParams(
      DEEP_PAGE_LINKS.TRANSACTIONS_DATE.path(
        date.year(),
        date.month(),
        date.date()
      )
    );
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

  const handleOnFilterClick = () => {
    // openDrawer(DRAWER_ROUTES.FILTER_TRANSACTION);
  };

  const handleOnCalendarDateChange = (date: Dayjs) => {
    navigateWithSearchParams(
      DEEP_PAGE_LINKS.TRANSACTIONS_DATE.path(
        date.year(),
        date.month(),
        date.date()
      )
    );
  };

  const containerHandlers = useSwipeable({
    onSwipedRight: () => {
      const previousDate = startDate.subtract(1, "d");
      navigateWithSearchParams(
        DEEP_PAGE_LINKS.TRANSACTIONS_DATE.path(
          previousDate.year(),
          previousDate.month(),
          previousDate.date()
        )
      );
    },
    onSwipedLeft: () => {
      const nextDate = startDate.add(1, "d");
      navigateWithSearchParams(
        DEEP_PAGE_LINKS.TRANSACTIONS_DATE.path(
          nextDate.year(),
          nextDate.month(),
          nextDate.date()
        )
      );
    },
    trackMouse: false,
  });

  return (
    <PageLayout>
      <PageLayout.HeaderRegion>
        <PageHeader
          title="Transactions"
          size="wide"
          subtitle={formatDate(startDate, DateFormat.MONTH_YEAR)}
          tabs={<TabsDate date={startDate} onDateChange={handleOnDateChange} />}
        />
      </PageLayout.HeaderRegion>

      <PageLayout.ContentRegion>
        <PageContent
          {...containerHandlers}
          size="wide"
          className="min-h-[calc(100dvh-25dvh)]"
        >
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
                    <Button
                      onClick={handleOnNewTransactionClick}
                      variant="outline"
                    >
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
      </PageLayout.ContentRegion>
    </PageLayout>
  );
};

const TransactionsPageWrapper = () => {
  const { year, month, day } = useParams<{
    year: string;
    month: string;
    day: string;
  }>();
  const maxValidDateRange = dayjs().add(5, "year");
  const hasParams = year && month && day;

  const initialDate = hasParams
    ? dayjs()
        .set("y", parseInt(year))
        .set("M", parseInt(month))
        .set("D", parseInt(day))
    : dayjs();

  if (
    !initialDate.isValid() ||
    initialDate.isAfter(maxValidDateRange) ||
    !hasParams
  ) {
    const today = dayjs();

    return (
      <Navigate
        to={DEEP_PAGE_LINKS.TRANSACTIONS_DATE.path(
          today.year(),
          today.month(),
          today.date()
        )}
        replace
      />
    );
  }

  return <TransactionsPage startDate={initialDate} />;
};

export default TransactionsPageWrapper;
