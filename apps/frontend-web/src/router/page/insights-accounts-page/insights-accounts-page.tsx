import { useApiInsightsAccountsSummaryQuery } from "@/hooks/use-api";
import {
  PageContent,
  SwitchInput,
  useMobileBreakpoint,
} from "@dimasbaguspm/versaur";
import { useInsightFilter } from "@/hooks/use-filter-state/built/use-insight-filter";
import { useState } from "react";
import { AccountSummaryTable } from "./components";

const InsightsAccountsPage = () => {
  const isMobile = useMobileBreakpoint();
  const { appliedFilters } = useInsightFilter();
  const [showPercentage, setShowPercentage] = useState(false);

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
      <div className="flex items-center justify-end mb-4">
        <SwitchInput
          value={showPercentage}
          onChange={setShowPercentage}
          label={showPercentage ? "Percentage" : "Value"}
        />
      </div>
      <AccountSummaryTable
        accountData={accountSummary?.data ?? []}
        showPercentage={showPercentage}
      />
    </PageContent>
  );
};

export default InsightsAccountsPage;
