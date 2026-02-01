import { useApiInsightsTransactionsSummaryQuery } from "@/hooks/use-api";
import { PageContent, useMobileBreakpoint } from "@dimasbaguspm/versaur";
import { useInsightFilter } from "@/hooks/use-filter-state/built/use-insight-filter";
import { HistoricalBreakdownTable } from "./components";

const InsightsOverviewPage = () => {
  const isMobile = useMobileBreakpoint();
  const { appliedFilters } = useInsightFilter();

  const { startDate, endDate, frequency } = appliedFilters;

  const [transactionSummary, isLoadingTransactions] =
    useApiInsightsTransactionsSummaryQuery({
      startDate,
      endDate,
      frequency,
    });

  return (
    <PageContent
      size={isMobile ? "narrow" : "wide"}
      className={isMobile ? "pb-20" : undefined}
    >
      <HistoricalBreakdownTable
        transactionData={transactionSummary?.data ?? []}
        frequency={transactionSummary?.frequency}
        isLoading={!!isLoadingTransactions}
      />
    </PageContent>
  );
};

export default InsightsOverviewPage;
