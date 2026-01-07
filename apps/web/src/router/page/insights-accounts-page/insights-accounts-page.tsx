import {
  useApiInsightsAccountSummaryQuery,
  useApiInsightsAccountsTrendsQuery,
} from "@/hooks/use-api";
import { PageContent, useMobileBreakpoint } from "@dimasbaguspm/versaur";
import { useInsightFilter } from "@/hooks/use-filter-state/built/use-insight-filter";
import { AccountSummaryTable, FundingSourceTreemap } from "./components";

const InsightsAccountsPage = () => {
  const isMobile = useMobileBreakpoint();
  const { appliedFilters } = useInsightFilter();

  const { startDate, endDate, frequency } = appliedFilters;

  // Fetch account insights data
  const [accountSummary, isLoadingAccounts] = useApiInsightsAccountSummaryQuery(
    {
      startDate,
      endDate,
    }
  );

  const [accountTrends] = useApiInsightsAccountsTrendsQuery({
    startDate,
    endDate,
    frequency:
      frequency === "daily" || frequency === "yearly" ? "weekly" : frequency,
  });

  return (
    <PageContent
      size={isMobile ? "narrow" : "wide"}
      className={isMobile ? "pb-20" : undefined}
    >
      {/* Main Content */}
      <div className="space-y-6">
        {/* Treemaps for Income and Expense */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FundingSourceTreemap
            accountData={accountSummary?.data ?? []}
            categoryData={[]}
            mode="sources"
          />
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Account Expenses
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Expense distribution by account
              </p>
            </div>
            <div className="flex items-center justify-center h-[400px] text-gray-500">
              {(accountSummary?.data ?? []).filter(
                (account) => Math.abs(account.expenseAmount ?? 0) > 0
              ).length > 0 ? (
                <div className="w-full">
                  {/* Render custom treemap for expenses by account */}
                  <div className="grid grid-cols-1 gap-2">
                    {(accountSummary?.data ?? [])
                      .filter(
                        (account) => Math.abs(account.expenseAmount ?? 0) > 0
                      )
                      .sort(
                        (a, b) =>
                          Math.abs(b.expenseAmount ?? 0) -
                          Math.abs(a.expenseAmount ?? 0)
                      )
                      .map((account, idx) => {
                        const total = (accountSummary?.data ?? []).reduce(
                          (sum, acc) => sum + Math.abs(acc.expenseAmount ?? 0),
                          0
                        );
                        const percentage =
                          total > 0
                            ? (Math.abs(account.expenseAmount ?? 0) / total) *
                              100
                            : 0;
                        const colors = [
                          "#ef4444",
                          "#f59e0b",
                          "#8b5cf6",
                          "#ec4899",
                          "#06b6d4",
                        ];
                        return (
                          <div
                            key={account.accountId}
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
                                {account.accountName}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                Rp
                                {Math.abs(
                                  account.expenseAmount ?? 0
                                ).toLocaleString()}
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
                <span>No expense data available</span>
              )}
            </div>
          </div>
        </div>

        {/* Account Summary Table */}
        <div className="grid grid-cols-1 gap-6">
          <AccountSummaryTable
            accountData={accountSummary?.data ?? []}
            isLoading={!!isLoadingAccounts}
          />
        </div>
      </div>
    </PageContent>
  );
};

export default InsightsAccountsPage;
