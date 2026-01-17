import { useApiInsightsTransactionsSummaryQuery } from "@/hooks/use-api";
import { PageContent, useMobileBreakpoint } from "@dimasbaguspm/versaur";
import { useInsightFilter } from "@/hooks/use-filter-state/built/use-insight-filter";
import { HistoricalBreakdownTable, InsightsBalanceCard } from "./components";

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

  const totalIncome = 0;
  const totalExpense = 0;

  return (
    <PageContent
      size={isMobile ? "narrow" : "wide"}
      className={isMobile ? "pb-20" : undefined}
    >
      {/* Main Content */}
      <div className="space-y-6">
        {/* Balance Card */}
        <div className="grid grid-cols-1 gap-6">
          <InsightsBalanceCard
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            summaryTransactions={transactionSummary?.data ?? []}
            isMobile={isMobile}
          />
        </div>

        {/* Historical Breakdown Table */}
        <div className="grid grid-cols-1 gap-6">
          <HistoricalBreakdownTable
            transactionData={transactionSummary?.data ?? []}
            frequency={transactionSummary?.frequency}
            isLoading={!!isLoadingTransactions}
          />
        </div>
      </div>
    </PageContent>
  );
};

export default InsightsOverviewPage;
