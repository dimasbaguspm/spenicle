import { useApiInsightsTransactionsSummaryQuery } from "@/hooks/use-api";
import {
  PageContent,
  SwitchInput,
  useMobileBreakpoint,
} from "@dimasbaguspm/versaur";
import { useInsightFilter } from "@/hooks/use-filter-state/built/use-insight-filter";
import { useState } from "react";
import { HistoricalBreakdownTable } from "./components";

const InsightsOverviewPage = () => {
  const isMobile = useMobileBreakpoint();
  const { appliedFilters } = useInsightFilter();
  const [showPercentage, setShowPercentage] = useState(false);

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
      <div className="flex items-center justify-end mb-4">
        <SwitchInput
          value={showPercentage}
          onChange={setShowPercentage}
          label={showPercentage ? "Percentage" : "Value"}
        />
      </div>
      <HistoricalBreakdownTable
        transactionData={transactionSummary?.data ?? []}
        frequency={transactionSummary?.frequency}
        isLoading={!!isLoadingTransactions}
        showPercentage={showPercentage}
      />
    </PageContent>
  );
};

export default InsightsOverviewPage;
