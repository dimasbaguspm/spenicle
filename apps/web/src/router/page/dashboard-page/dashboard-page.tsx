import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { DEEP_PAGE_LINKS } from "@/constant/page-routes";
import {
  useApiInsightsTotalSummaryQuery,
  useApiInsightsTransactionsSummaryQuery,
  useApiTransactionsPaginatedQuery,
} from "@/hooks/use-api";
import { When } from "@/lib/when";
import { useDrawerProvider } from "@/providers/drawer-provider";
import type { TransactionModel } from "@/types/schemas";
import {
  ChipSingleInput,
  PageContent,
  PageHeader,
  PageLayout,
  useMobileBreakpoint,
} from "@dimasbaguspm/versaur";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { DashboardTransactionViewMode } from "./types";
import { NetBalanceCard } from "./components/net-balance-card";

const DashboardPage = () => {
  const isMobile = useMobileBreakpoint();
  const { openDrawer } = useDrawerProvider();
  const navigate = useNavigate();

  const [totalSummary] = useApiInsightsTotalSummaryQuery({});
  const [summaryTransactions] = useApiInsightsTransactionsSummaryQuery({
    frequency: "monthly",
    startDate: dayjs().subtract(6, "month").startOf("month").toISOString(),
    endDate: dayjs().endOf("month").toISOString(),
  });
  const [transactions] = useApiTransactionsPaginatedQuery({
    limit: 5,
    orderBy: "date",
    orderDirection: "desc",
  });

  const [transactionViewMode, setTransactionViewMode] =
    useState<DashboardTransactionViewMode>(DashboardTransactionViewMode.Recent);

  const totalIncome = totalSummary?.income ?? 0;
  const totalExpense = Math.abs(totalSummary?.expense ?? 0);
  const netBalance = totalIncome - totalExpense;

  // Get current month summary from summaryTransactions
  const currentMonthSummary = useMemo(() => {
    if (
      !Array.isArray(summaryTransactions) ||
      summaryTransactions.length === 0
    ) {
      return { income: 0, expense: 0 };
    }
    const latest = summaryTransactions[summaryTransactions.length - 1];
    return {
      income: Math.abs(latest?.income ?? 0),
      expense: Math.abs(latest?.expense ?? 0),
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

              {/* <ThisMonthSummaryCards
                totalIncome={currentMonthSummary.income}
                totalExpense={currentMonthSummary.expense}
                onViewSummaryClick={handleOnViewSummaryClick}
                onViewTransactionsClick={handleOnViewTransactionsClick}
              /> */}
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
              <When
                condition={
                  transactionViewMode === DashboardTransactionViewMode.Recent
                }
              >
                <RecentTransactions
                  transactions={transactions?.items ?? []}
                  onTransactionClick={handleTransactionClick}
                  onViewAll={handleViewAllTransactions}
                />
              </When> */}
            </div>
          </div>
        </PageContent>
      </PageLayout.ContentRegion>
    </PageLayout>
  );
};

export default DashboardPage;
