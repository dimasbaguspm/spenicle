import { formatPrice, PriceFormat } from "@/lib/format-price";
import type { InsightsTransactionModel } from "@/types/schemas";
import {
  Badge,
  Heading,
  Text,
  useMobileBreakpoint,
} from "@dimasbaguspm/versaur";
import { cx } from "class-variance-authority";
import dayjs from "dayjs";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useInsightFilter } from "@/hooks/use-filter-state";
import { DateFormat, formatDate } from "@/lib/format-date";
import { When } from "@/lib/when";

interface InsightsBalanceCardProps {
  summaryTransactions: NonNullable<InsightsTransactionModel["data"]>;
}

export const InsightsBalanceCard = ({
  summaryTransactions = [],
}: InsightsBalanceCardProps) => {
  const isMobile = useMobileBreakpoint();
  const { appliedFilters } = useInsightFilter();

  const formatPeriodLabel = (period: string, frequency: string) => {
    switch (frequency) {
      case "daily":
        return dayjs(period).format("MMM DD");
      case "weekly":
        // Handle ISO week format like "2026-W09"
        const weekMatch = period.match(/-W(\d+)$/);
        return weekMatch ? `W${weekMatch[1]}` : period;
      case "monthly":
        return dayjs(period).format("MMM");
      case "yearly":
        return period; // Already in YYYY format
      default:
        return dayjs(period).format("MMM");
    }
  };

  const totalIncome =
    summaryTransactions?.reduce((sum, item) => sum + item.incomeAmount, 0) ?? 0;
  const totalExpense =
    summaryTransactions?.reduce((sum, item) => sum + item.expenseAmount, 0) ??
    0;

  const netBalance = totalIncome - totalExpense;

  // Process chart data as cumulative balance
  const chartData = useMemo(() => {
    if (!Array.isArray(summaryTransactions) || summaryTransactions.length === 0)
      return [];

    const sorted = summaryTransactions
      .map((item) => {
        const income = item.incomeAmount ?? 0;
        const expense = Math.abs(item.expenseAmount ?? 0);
        const net = item.net ?? 0;

        return {
          month: formatPeriodLabel(
            item.period,
            appliedFilters.frequency || "monthly",
          ),
          income,
          expense,
          net,
          date: item.period,
        };
      })
      .sort((a, b) => dayjs(a.date).unix() - dayjs(b.date).unix());

    let carry = 0;
    const withRunningBalance = sorted.map((item) => {
      const runningBalance = carry + item.net;
      carry = runningBalance;
      return { ...item, runningBalance };
    });

    return withRunningBalance;
  }, [summaryTransactions]);

  const percentageChange = useMemo(() => {
    // Find periods with actual activity (totalCount > 0)
    const activePeriods = summaryTransactions.filter(
      (item) => (item.totalCount ?? 0) > 0,
    );

    if (activePeriods.length < 2) return 0;

    // Compare the last active period to the previous active period
    const currentNet = activePeriods[0]?.net ?? 0;
    const previousNet = activePeriods[1]?.net ?? 0;

    // Avoid division by zero
    if (previousNet === 0) {
      return currentNet > 0 ? 100 : currentNet < 0 ? -100 : 0;
    }

    return ((currentNet - previousNet) / Math.abs(previousNet)) * 100;
  }, [summaryTransactions]);

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-4">
        <When condition={isMobile}>
          <div className="flex flex-col">
            <Text as="small" color="ghost" transform="uppercase">
              Period
            </Text>
            <Text as="small" color="black">
              {formatDate(appliedFilters.startDate!, DateFormat.DAY_MONTH)} -{" "}
              {formatDate(appliedFilters.endDate!, DateFormat.DAY_MONTH_YEAR)}
            </Text>
          </div>
        </When>
        <When condition={!isMobile}>
          <div className="flex flex-col gap-1">
            <Text as="small" color="ghost" transform="uppercase">
              Period
            </Text>
            <Text as="p" color="black">
              {formatDate(appliedFilters.startDate!, DateFormat.MEDIUM_DATE)} -{" "}
              {formatDate(appliedFilters.endDate!, DateFormat.MEDIUM_DATE)}
            </Text>
          </div>
        </When>

        {/* Right: Net Balance */}
        <div className="text-right flex-shrink-0">
          <Heading as="h1" color="primary">
            {formatPrice(netBalance, PriceFormat.CURRENCY_NO_DECIMALS)}
          </Heading>
          <div className="flex items-center justify-end gap-2">
            <Badge
              color={percentageChange >= 0 ? "success" : "danger"}
              shape="rounded"
              className="text-xs"
            >
              {percentageChange >= 0 ? "+" : ""}
              {percentageChange.toFixed(1)}%
            </Badge>
            <Text as="small" color="gray" className="text-xs">
              vs last period
            </Text>
          </div>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className={cx("relative", isMobile ? "h-48" : "h-64")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ right: -10, left: -15 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-primary)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="2 2"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke="var(--color-border)"
              tick={{ fontSize: 12, fill: "var(--color-foreground-light)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="var(--color-border)"
              tick={{ fontSize: 12, fill: "var(--color-foreground-light)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatPrice(value, PriceFormat.COMPACT)}
            />

            <Area
              type="linear"
              dataKey="runningBalance"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              fill="url(#balanceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};
