import { formatPrice, PriceFormat } from "@/lib/format-price";
import type { InsightsTransactionModel } from "@/types/schemas";
import { Badge } from "@dimasbaguspm/versaur";
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

interface NetBalanceCardProps {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  summaryTransactions: InsightsTransactionModel["data"];
  isMobile?: boolean;
}

export const NetBalanceCard = ({
  balance,
  totalIncome,
  totalExpense,
  summaryTransactions,
  isMobile,
}: NetBalanceCardProps) => {
  // Process chart data as cumulative balance - mobile shows last 4 months (current + 3 previous), desktop shows full range
  const chartData = useMemo(() => {
    if (!Array.isArray(summaryTransactions) || summaryTransactions.length === 0)
      return [];

    const sorted = summaryTransactions
      .map((item) => {
        const income = item.incomeAmount ?? 0;
        const expense = Math.abs(item.expenseAmount ?? 0);
        const net = item.net ?? 0;

        return {
          month: dayjs(item.period).format("MMM"),
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

    return isMobile ? withRunningBalance.slice(-4) : withRunningBalance;
  }, [summaryTransactions, isMobile]);

  const percentageChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const current = chartData[chartData.length - 1]?.runningBalance ?? 0;
    const previous = chartData[chartData.length - 2]?.runningBalance ?? 0;
    if (previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  }, [chartData]);

  return (
    <div className="bg-primary rounded-2xl p-6 text-white relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-primary-light text-sm font-medium">Balance</p>
          <p className="text-3xl font-bold mt-1">
            {formatPrice(balance, PriceFormat.CURRENCY)}
          </p>
          <div className="mt-2 flex items-center space-x-2 text-sm">
            <Badge
              color={percentageChange >= 0 ? "secondary" : "primary"}
              shape="rounded"
            >
              {percentageChange >= 0 ? "+" : ""}
              {percentageChange.toFixed(1)}%
            </Badge>
            <span className="text-primary-light text-xs">vs last month</span>
          </div>
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className={cx("relative mt-4", isMobile ? "h-52" : "h-76")}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis
              dataKey="month"
              stroke="rgba(255,255,255,0.6)"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.6)"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => formatPrice(value, PriceFormat.COMPACT)}
            />

            <Area
              type="monotone"
              dataKey="runningBalance"
              stroke="#ffffff"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorNet)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white border-opacity-20">
        <div>
          <p className="text-primary-light text-xs">Total Income</p>
          <p className="text-lg font-bold">
            {formatPrice(totalIncome, PriceFormat.CURRENCY)}
          </p>
        </div>
        <div>
          <p className="text-primary-light text-xs">Total Expense</p>
          <p className="text-lg font-bold">
            {formatPrice(totalExpense, PriceFormat.CURRENCY)}
          </p>
        </div>
      </div>
    </div>
  );
};
