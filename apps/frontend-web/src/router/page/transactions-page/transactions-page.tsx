import { DateFormat, formatDate } from "@/lib/format-date";
import type { Dayjs } from "dayjs";
import type { FC } from "react";
import { Suspense } from "react";
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { DEEP_PAGE_LINKS, PAGE_ROUTES } from "@/constant/page-routes";
import {
  ChipSingleInput,
  Icon,
  PageHeader,
  PageLayout,
  PageLoader,
} from "@dimasbaguspm/versaur";
import { TabsDate } from "./components/tabs-date";
import dayjs from "dayjs";
import { LayoutGridIcon, ListCollapseIcon } from "lucide-react";

interface TransactionsPageProps {
  startDate: Dayjs;
}

const TransactionsPage: FC<TransactionsPageProps> = ({ startDate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const isGridView = location.pathname.includes(PAGE_ROUTES.TRANSACTIONS_GRID);
  const activeView = isGridView ? "grid" : "list";

  const handleOnDateChange = (date: Dayjs) => {
    const pathBuilder = isGridView
      ? DEEP_PAGE_LINKS.TRANSACTIONS_GRID_DATE.path
      : DEEP_PAGE_LINKS.TRANSACTIONS_LIST_DATE.path;

    navigate({
      pathname: pathBuilder(date.year(), date.month(), date.date()),
      search: searchParams.toString(),
    });
  };

  const handleViewTypeChange = (value: string) => {
    if (value === "grid") {
      navigate({
        pathname: DEEP_PAGE_LINKS.TRANSACTIONS_GRID.path,
        search: searchParams.toString(),
      });
    } else {
      navigate({
        pathname: DEEP_PAGE_LINKS.TRANSACTIONS_LIST_DATE.path(
          startDate.year(),
          startDate.month(),
          startDate.date(),
        ),
        search: searchParams.toString(),
      });
    }
  };

  return (
    <PageLayout>
      <PageLayout.HeaderRegion>
        <PageHeader
          title="Transactions"
          size="wide"
          subtitle={formatDate(startDate, DateFormat.MONTH_YEAR)}
          tabs={
            !isGridView ? (
              <TabsDate date={startDate} onDateChange={handleOnDateChange} />
            ) : undefined
          }
          actions={
            <ChipSingleInput
              name="view-type"
              value={activeView}
              onChange={handleViewTypeChange}
            >
              <ChipSingleInput.Option value="list">
                <Icon as={ListCollapseIcon} color="inherit" size="sm" />
                List
              </ChipSingleInput.Option>
              <ChipSingleInput.Option value="grid">
                <Icon as={LayoutGridIcon} color="inherit" size="sm" />
                Grid
              </ChipSingleInput.Option>
            </ChipSingleInput>
          }
          mobileActions={
            <ChipSingleInput
              name="view-type-mobile"
              value={activeView}
              onChange={handleViewTypeChange}
            >
              <ChipSingleInput.Option value="list">
                <Icon as={ListCollapseIcon} color="inherit" size="sm" />
              </ChipSingleInput.Option>
              <ChipSingleInput.Option value="grid">
                <Icon as={LayoutGridIcon} color="inherit" size="sm" />
              </ChipSingleInput.Option>
            </ChipSingleInput>
          }
        />
      </PageLayout.HeaderRegion>

      <PageLayout.ContentRegion>
        <Suspense fallback={<PageLoader />}>
          <Outlet context={{ startDate }} />
        </Suspense>
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
  const location = useLocation();
  const maxValidDateRange = dayjs().add(5, "year");

  const isGridView = location.pathname.includes(PAGE_ROUTES.TRANSACTIONS_GRID);
  const isListView = location.pathname.includes(PAGE_ROUTES.TRANSACTIONS_LIST);

  if (!isListView && !isGridView) {
    const today = dayjs();
    return (
      <Navigate
        to={DEEP_PAGE_LINKS.TRANSACTIONS_LIST_DATE.path(
          today.year(),
          today.month(),
          today.date(),
        )}
        replace
      />
    );
  }

  if (isGridView) {
    return <TransactionsPage startDate={dayjs()} />;
  }

  const hasParams = year && month && day;

  if (!hasParams) {
    const today = dayjs();
    return (
      <Navigate
        to={DEEP_PAGE_LINKS.TRANSACTIONS_LIST_DATE.path(
          today.year(),
          today.month(),
          today.date(),
        )}
        replace
      />
    );
  }

  const initialDate = dayjs()
    .set("y", parseInt(year))
    .set("M", parseInt(month))
    .set("D", parseInt(day));

  if (!initialDate.isValid() || initialDate.isAfter(maxValidDateRange)) {
    const today = dayjs();
    return (
      <Navigate
        to={DEEP_PAGE_LINKS.TRANSACTIONS_LIST_DATE.path(
          today.year(),
          today.month(),
          today.date(),
        )}
        replace
      />
    );
  }

  return <TransactionsPage startDate={initialDate} />;
};

export default TransactionsPageWrapper;
