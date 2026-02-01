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
import { DateFormat, formatDate } from "@/lib/format-date";
import { When } from "@/lib/when";

interface NetBalanceCardProps {
  summaryTransactions: InsightsTransactionModel["data"];
  startDate: string;
  endDate: string;
  frequency?: string;
  isMobile?: boolean;
}

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

export const NetBalanceCard = ({
  summaryTransactions = [],
  startDate,
  endDate,
  frequency = "monthly",
  isMobile,
}: NetBalanceCardProps) => {
  const isMobileBreakpoint = useMobileBreakpoint();
  const finalIsMobile = isMobile ?? isMobileBreakpoint;

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
          month: formatPeriodLabel(item.period, frequency),
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
  }, [summaryTransactions, frequency]);

  const percentageChange = useMemo(() => {
    if (!Array.isArray(summaryTransactions)) return 0;

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
    <div className="bg-background">
      {/* Mobile Layout */}
      <When condition={finalIsMobile}>
        <div className="space-y-4">
          {/* Period and Balance - Top */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex flex-col">
              <Text as="small" color="ghost" transform="uppercase">
                Period
              </Text>
              <Text as="small" color="black" className="whitespace-nowrap">
                {formatDate(startDate, DateFormat.DAY_MONTH)} -{" "}
                {formatDate(endDate, DateFormat.DAY_MONTH_YEAR)}
              </Text>
            </div>
            <div className="text-right">
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

          {/* Chart - Middle */}
          <div className={cx("relative", "h-48")}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ right: -10, left: -15 }}>
                <defs>
                  <linearGradient
                    id="balanceGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
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
                  tickFormatter={(value) =>
                    formatPrice(value, PriceFormat.COMPACT)
                  }
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

          {/* Income & Expense - Bottom */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
            <div className="flex gap-2 justify-center">
              <Text as="small" color="ghost" transform="uppercase">
                Income
              </Text>
              <Text as="small" color="black" className="font-semibold">
                {formatPrice(totalIncome, PriceFormat.CURRENCY_NO_DECIMALS)}
              </Text>
            </div>
            <div className="flex gap-2 justify-center">
              <Text as="small" color="ghost" transform="uppercase">
                Expense
              </Text>
              <Text as="small" color="black" className="font-semibold">
                {formatPrice(totalExpense, PriceFormat.CURRENCY_NO_DECIMALS)}
              </Text>
            </div>
          </div>
        </div>
      </When>

      {/* Desktop Layout */}
      <When condition={!finalIsMobile}>
        <div className="flex items-center justify-between mb-6 gap-4">
          {/* Left: Period Info */}
          <div className="flex flex-col gap-1">
            <Text as="small" color="ghost" transform="uppercase">
              Period
            </Text>
            <Text as="p" color="black">
              {formatDate(startDate, DateFormat.MEDIUM_DATE)} -{" "}
              {formatDate(endDate, DateFormat.MEDIUM_DATE)}
            </Text>
          </div>

          {/* Center: Income & Expense */}
          <div className="flex gap-4 flex-1 justify-center">
            <div className="flex flex-col items-center">
              <Text as="small" color="ghost" transform="uppercase">
                Income
              </Text>
              <Text as="p" color="black" className="font-semibold">
                {formatPrice(totalIncome, PriceFormat.CURRENCY_NO_DECIMALS)}
              </Text>
            </div>
            <div className="flex flex-col items-center">
              <Text as="small" color="ghost" transform="uppercase">
                Expense
              </Text>
              <Text as="p" color="black" className="font-semibold">
                {formatPrice(totalExpense, PriceFormat.CURRENCY_NO_DECIMALS)}
              </Text>
            </div>
          </div>

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
              <Text
                as="small"
                color="gray"
                className="text-xs whitespace-nowrap"
              >
                vs last period
              </Text>
            </div>
          </div>
        </div>

        {/* Desktop Chart */}
        <div className={cx("relative h-64")}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ right: -10, left: -15 }}>
              <defs>
                <linearGradient
                  id="balanceGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
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
                tickFormatter={(value) =>
                  formatPrice(value, PriceFormat.COMPACT)
                }
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
      </When>
    </div>
  );
};
