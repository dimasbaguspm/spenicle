import { useApiInsightsCategoriesSummaryQuery } from "@/hooks/use-api";
import {
  PageContent,
  SwitchInput,
  useMobileBreakpoint,
} from "@dimasbaguspm/versaur";
import { useInsightFilter } from "@/hooks/use-filter-state/built/use-insight-filter";
import { useState } from "react";
import { CategorySummaryTable } from "./components";

const InsightsCategoriesPage = () => {
  const isMobile = useMobileBreakpoint();
  const { appliedFilters } = useInsightFilter();
  const [showPercentage, setShowPercentage] = useState(false);

  const { startDate, endDate } = appliedFilters;

  const [categorySummary] = useApiInsightsCategoriesSummaryQuery({
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
      <CategorySummaryTable
        categoryData={categorySummary?.data ?? []}
        showPercentage={showPercentage}
      />
    </PageContent>
  );
};

export default InsightsCategoriesPage;
