import { useApiInsightsCategoriesSummaryQuery } from "@/hooks/use-api";
import { PageContent, useMobileBreakpoint } from "@dimasbaguspm/versaur";
import { useInsightFilter } from "@/hooks/use-filter-state/built/use-insight-filter";
import { CategorySummaryTable, FundingSourceTreemap } from "./components";

const InsightsCategoriesPage = () => {
  const isMobile = useMobileBreakpoint();
  const { appliedFilters } = useInsightFilter();

  const { startDate, endDate } = appliedFilters;

  // Fetch category insights data
  const [categorySummary, isLoadingCategories] =
    useApiInsightsCategoriesSummaryQuery({
      startDate,
      endDate,
    });

  return (
    <PageContent
      size={isMobile ? "narrow" : "wide"}
      className={isMobile ? "pb-20" : undefined}
    >
      {/* Main Content */}
      <div className="space-y-6">
        {/* Treemaps for Category Income and Expense */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Category Income
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Income distribution by category
              </p>
            </div>
            <div className="flex items-center justify-center h-[400px] text-gray-500">
              {(categorySummary?.data ?? []).filter(
                (category) => (category.incomeAmount ?? 0) > 0
              ).length > 0 ? (
                <div className="w-full">
                  <div className="grid grid-cols-1 gap-2">
                    {(categorySummary?.data ?? [])
                      .filter((category) => (category.incomeAmount ?? 0) > 0)
                      .sort(
                        (a, b) => (b.incomeAmount ?? 0) - (a.incomeAmount ?? 0)
                      )
                      .map((category, idx) => {
                        const total = (categorySummary?.data ?? []).reduce(
                          (sum, cat) => sum + (cat.incomeAmount ?? 0),
                          0
                        );
                        const percentage =
                          total > 0
                            ? ((category.incomeAmount ?? 0) / total) * 100
                            : 0;
                        const colors = [
                          "#10b981",
                          "#3b82f6",
                          "#f59e0b",
                          "#8b5cf6",
                          "#ec4899",
                        ];
                        return (
                          <div
                            key={category.categoryId}
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{
                              backgroundColor: `${
                                colors[idx % colors.length]
                              }20`,
                            }}
                          >
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: colors[idx % colors.length],
                                }}
                              />
                              <span className="font-medium text-gray-700">
                                {category.categoryName}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                Rp
                                {(category.incomeAmount ?? 0).toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <span>No income data available</span>
              )}
            </div>
          </div>

          <FundingSourceTreemap
            accountData={[]}
            categoryData={categorySummary?.data ?? []}
            mode="expenses"
          />
        </div>

        {/* Category Summary Table */}
        <div className="grid grid-cols-1 gap-6">
          <CategorySummaryTable
            categoryData={categorySummary?.data ?? []}
            isLoading={!!isLoadingCategories}
          />
        </div>
      </div>
    </PageContent>
  );
};

export default InsightsCategoriesPage;
