import {
  useApiInsightsTransactionsSummaryQuery,
  useApiTransactionsPaginatedQuery,
} from "@/hooks/use-api";
import { When } from "@/lib/when";
import {
  ChipSingleInput,
  PageContent,
  PageHeader,
  PageLayout,
  useMobileBreakpoint,
} from "@dimasbaguspm/versaur";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { DashboardTransactionViewMode } from "./types";
import { NetBalanceCard } from "./components/net-balance-card";
import { ThisMonthSummaryCards } from "./components/this-month-summary-card";
import { RecentTransactions } from "./components/recent-transactions";

const DashboardPage = () => {
  const isMobile = useMobileBreakpoint();

  // Fetch transaction summary for the last 6 months to show trends
  const [summaryTransactions] = useApiInsightsTransactionsSummaryQuery({
    frequency: "monthly",
    startDate: dayjs().subtract(5, "month").startOf("month").toISOString(),
    endDate: dayjs().endOf("month").toISOString(),
  });
  const [transactions] = useApiTransactionsPaginatedQuery({
    pageSize: 5,
    sortBy: "date",
    sortOrder: "desc",
  });

  const [transactionViewMode, setTransactionViewMode] =
    useState<DashboardTransactionViewMode>(DashboardTransactionViewMode.Recent);

  const totalIncome = 0;
  const totalExpense = 0;
  const netBalance = totalIncome - totalExpense;

  const currentMonthSummary = useMemo(() => {
    if (
      !Array.isArray(summaryTransactions?.data) ||
      summaryTransactions.data.length === 0
    ) {
      return { income: 0, expense: 0 };
    }
    // api design show most recent month first
    const latest = summaryTransactions.data[0];
    return {
      income: latest?.incomeAmount ?? 0,
      expense: Math.abs(latest?.expenseAmount ?? 0),
    };
  }, [summaryTransactions]);

  const handleTransactionViewModeChange = (mode: string) => {
    setTransactionViewMode(mode as DashboardTransactionViewMode);
  };

  return (
    <PageLayout>
      <PageLayout.HeaderRegion>
        <PageHeader title={`Welcome!`} size="wide" />
      </PageLayout.HeaderRegion>
      <PageLayout.ContentRegion>
        <PageContent
          size={isMobile ? "narrow" : "wide"}
          className={isMobile ? "pb-20" : undefined}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <NetBalanceCard
                balance={netBalance}
                totalIncome={totalIncome}
                totalExpense={totalExpense}
                summaryTransactions={summaryTransactions?.data ?? []}
                isMobile={isMobile}
              />
              <ThisMonthSummaryCards
                totalIncome={currentMonthSummary.income}
                totalExpense={currentMonthSummary.expense}
              />
            </div>

            <div className="lg:col-span-1 space-y-6">
              <ChipSingleInput
                name="fruits"
                value={transactionViewMode}
                onChange={handleTransactionViewModeChange}
                size="md"
              >
                <ChipSingleInput.Option
                  value={DashboardTransactionViewMode.Recent}
                >
                  Recent Transactions
                </ChipSingleInput.Option>
                <ChipSingleInput.Option
                  value={DashboardTransactionViewMode.Upcoming}
                >
                  Upcoming Bills
                </ChipSingleInput.Option>
              </ChipSingleInput>
              {/* <When
                condition={
                  transactionViewMode === DashboardTransactionViewMode.Upcoming
                }
              >
                <ScheduledTransactions
                  scheduledTransactions={scheduledTransactions?.items ?? []}
                  onScheduledTransactionClick={handleScheduledTransactionClick}
                  onViewAll={handleViewAllScheduled}
                />
              </When>
              */}
              <When
                condition={
                  transactionViewMode === DashboardTransactionViewMode.Recent
                }
              >
                <RecentTransactions transactions={transactions?.items ?? []} />
              </When>
            </div>
          </div>
        </PageContent>
      </PageLayout.ContentRegion>
    </PageLayout>
  );
};

export default DashboardPage;
