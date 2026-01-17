import { useApiInsightsAccountsSummaryQuery } from "@/hooks/use-api";
import { PageContent, useMobileBreakpoint } from "@dimasbaguspm/versaur";
import { useInsightFilter } from "@/hooks/use-filter-state/built/use-insight-filter";
import { AccountSummaryTable } from "./components";

const InsightsAccountsPage = () => {
  const isMobile = useMobileBreakpoint();
  const { appliedFilters } = useInsightFilter();

  const { startDate, endDate } = appliedFilters;

  const [accountSummary] = useApiInsightsAccountsSummaryQuery({
    startDate,
    endDate,
  });

  return (
    <PageContent
      size={isMobile ? "narrow" : "wide"}
      className={isMobile ? "pb-20" : undefined}
    >
      <AccountSummaryTable accountData={accountSummary?.data ?? []} />
    </PageContent>
  );
};

export default InsightsAccountsPage;
