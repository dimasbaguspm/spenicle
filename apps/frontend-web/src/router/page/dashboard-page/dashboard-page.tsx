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
import { ScheduledTransactionsWidget } from "./components/scheduled-transaction-widget";

const DashboardPage = () => {
  const isMobile = useMobileBreakpoint();

  // Default to last semester (current month + past 5 months)
  const startDate = dayjs().subtract(5, "month").startOf("month").toISOString();
  const endDate = dayjs().endOf("month").toISOString();

  const [summaryTransactions] = useApiInsightsTransactionsSummaryQuery({
    frequency: "monthly",
    startDate,
    endDate,
  });
  const [transactions] = useApiTransactionsPaginatedQuery({
    pageSize: 5,
    sortBy: "date",
    sortOrder: "desc",
  });

  const [transactionViewMode, setTransactionViewMode] =
    useState<DashboardTransactionViewMode>(DashboardTransactionViewMode.Recent);

  const currentMonthSummary = useMemo(() => {
    if (
      !Array.isArray(summaryTransactions?.data) ||
      summaryTransactions.data.length === 0
    ) {
      return { income: 0, expense: 0 };
    }
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
                summaryTransactions={summaryTransactions?.data ?? []}
                startDate={startDate}
                endDate={endDate}
                frequency="monthly"
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
              <When
                condition={
                  transactionViewMode === DashboardTransactionViewMode.Upcoming
                }
              >
                <ScheduledTransactionsWidget />
              </When>

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
