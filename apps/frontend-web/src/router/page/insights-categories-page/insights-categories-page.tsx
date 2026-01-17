import { useApiInsightsCategoriesSummaryQuery } from "@/hooks/use-api";
import { PageContent, useMobileBreakpoint } from "@dimasbaguspm/versaur";
import { useInsightFilter } from "@/hooks/use-filter-state/built/use-insight-filter";
import { CategorySummaryTable } from "./components";

const InsightsCategoriesPage = () => {
  const isMobile = useMobileBreakpoint();
  const { appliedFilters } = useInsightFilter();

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
      <CategorySummaryTable categoryData={categorySummary?.data ?? []} />
    </PageContent>
  );
};

export default InsightsCategoriesPage;
