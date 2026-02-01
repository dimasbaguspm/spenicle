import { PAGE_ROUTES } from "@/constant/page-routes";
import { useApiInsightsTransactionsSummaryQuery } from "@/hooks/use-api";
import { useInsightFilter } from "@/hooks/use-filter-state";
import {
  PageContent,
  PageHeader,
  PageLayout,
  PageLoader,
  useMobileBreakpoint,
} from "@dimasbaguspm/versaur";
import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
  InsightsBalanceCard,
  InsightsTabs,
  InsightsDateRangeSelector,
} from "./components";

const InsightsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMobileBreakpoint();

  const { appliedFilters } = useInsightFilter();

  const { startDate, endDate, frequency } = appliedFilters;

  const [transactionSummary] = useApiInsightsTransactionsSummaryQuery({
    startDate,
    endDate,
    frequency,
  });

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes(PAGE_ROUTES.INSIGHTS_ACCOUNTS)) return "accounts";
    if (path.includes(PAGE_ROUTES.INSIGHTS_CATEGORIES)) return "categories";
    return "overview";
  };

  const activeTab = getActiveTab();

  const handleTabChange = (value: string) => {
    switch (value) {
      case "overview":
        navigate({
          pathname: PAGE_ROUTES.INSIGHTS,
          search: location.search,
        });
        break;
      case "accounts":
        navigate({
          pathname: PAGE_ROUTES.INSIGHTS_ACCOUNTS,
          search: location.search,
        });
        break;
      case "categories":
        navigate({
          pathname: PAGE_ROUTES.INSIGHTS_CATEGORIES,
          search: location.search,
        });
        break;
    }
  };

  return (
    <PageLayout>
      <PageLayout.HeaderRegion>
        <PageHeader title="Insights" size="wide" />
      </PageLayout.HeaderRegion>
      <PageLayout.ContentRegion>
        <Suspense fallback={<PageLoader />}>
          <PageContent size={isMobile ? "narrow" : "wide"} className="pb-4">
            <InsightsBalanceCard
              summaryTransactions={transactionSummary?.data ?? []}
            />
            <InsightsTabs activeTab={activeTab} onTabChange={handleTabChange} />
            <InsightsDateRangeSelector />
          </PageContent>

          <Outlet />
        </Suspense>
      </PageLayout.ContentRegion>
    </PageLayout>
  );
};

export default InsightsPage;
