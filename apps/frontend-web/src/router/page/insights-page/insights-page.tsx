import { DEEP_PAGE_LINKS, PAGE_ROUTES } from "@/constant/page-routes";
import { useApiInsightsTransactionsSummaryQuery } from "@/hooks/use-api";
import { useInsightFilter } from "@/hooks/use-filter-state";
import {
  ChipSingleInput,
  Icon,
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
import { ChartBarIcon, MapPinnedIcon } from "lucide-react";

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

  const isMapInsight = location.pathname.includes(PAGE_ROUTES.INSIGHTS_MAP);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes(PAGE_ROUTES.INSIGHTS_ACCOUNTS)) return "accounts";
    if (path.includes(PAGE_ROUTES.INSIGHTS_CATEGORIES)) return "categories";
    return "overview";
  };

  const activeTab = getActiveTab();

  const handleInsightTypeChange = (value: string) => {
    switch (value) {
      case "chart":
        navigate({
          pathname: DEEP_PAGE_LINKS.INSIGHTS.path,
          search: location.search,
        });
        break;
      case "map":
        navigate({
          pathname: DEEP_PAGE_LINKS.INSIGHTS_MAP.path,
          search: location.search,
        });
        break;
    }
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case "overview":
        navigate({
          pathname: DEEP_PAGE_LINKS.INSIGHTS.path,
          search: location.search,
        });
        break;
      case "accounts":
        navigate({
          pathname: DEEP_PAGE_LINKS.INSIGHTS_ACCOUNTS.path,
          search: location.search,
        });
        break;
      case "categories":
        navigate({
          pathname: DEEP_PAGE_LINKS.INSIGHTS_CATEGORIES.path,
          search: location.search,
        });
        break;
    }
  };

  return (
    <PageLayout>
      <PageLayout.HeaderRegion>
        <PageHeader
          title="Insights"
          size="wide"
          actions={
            <ChipSingleInput
              name="type"
              value={isMapInsight ? "map" : "chart"}
              onChange={handleInsightTypeChange}
            >
              <ChipSingleInput.Option value="chart">
                <Icon as={ChartBarIcon} color="inherit" size="sm" />
                Chart
              </ChipSingleInput.Option>
              <ChipSingleInput.Option value="map">
                <Icon as={MapPinnedIcon} color="inherit" size="sm" />
                Map
              </ChipSingleInput.Option>
            </ChipSingleInput>
          }
          mobileActions={
            <ChipSingleInput
              name="type"
              value={isMapInsight ? "map" : "chart"}
              onChange={handleInsightTypeChange}
            >
              <ChipSingleInput.Option value="chart">
                <Icon as={ChartBarIcon} color="inherit" size="sm" />
              </ChipSingleInput.Option>
              <ChipSingleInput.Option value="map">
                <Icon as={MapPinnedIcon} color="inherit" size="sm" />
              </ChipSingleInput.Option>
            </ChipSingleInput>
          }
        />
      </PageLayout.HeaderRegion>
      <PageLayout.ContentRegion>
        <Suspense fallback={<PageLoader />}>
          {!isMapInsight && (
            <PageContent size={isMobile ? "narrow" : "wide"} className="pb-4">
              <InsightsBalanceCard
                summaryTransactions={transactionSummary?.data ?? []}
              />
              <InsightsTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
              <InsightsDateRangeSelector />
            </PageContent>
          )}

          <Outlet />
        </Suspense>
      </PageLayout.ContentRegion>
    </PageLayout>
  );
};

export default InsightsPage;
