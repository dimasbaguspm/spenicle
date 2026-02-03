import { FC } from "react";
import {
  AreaChart,
  Area,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts";
import { AccountStatisticCashFlowPulseModel } from "@/types/schemas";
import { formatPrice, PriceFormat } from "@/lib/format-price";
import { formatDate, DateFormat } from "@/lib/format-date";
import { Text } from "@dimasbaguspm/versaur";

interface AccountsStatisticCashFlowPulseProps {
  data: AccountStatisticCashFlowPulseModel;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-2 shadow-sm">
        <p className="text-xs font-semibold text-[var(--color-foreground-bold)]">
          {formatDate(data.date, DateFormat.DAY_MONTH_YEAR)}
        </p>
        <p className="text-xs text-[var(--color-foreground-light)]">
          {formatPrice(data.balance, PriceFormat.COMPACT_CURRENCY)}
        </p>
      </div>
    );
  }
  return null;
};

const formatYAxisLabel = (value: number): string => {
  return formatPrice(value, PriceFormat.COMPACT_CURRENCY);
};

export const AccountsStatisticCashFlowPulse: FC<
  AccountsStatisticCashFlowPulseProps
> = ({ data }) => {
  // Determine trend direction based on start and end balance
  const isIncreasing = data.endingBalance > data.startingBalance;
  const balanceChange = data.endingBalance - data.startingBalance;
  const changePercentage = (
    (balanceChange / data.startingBalance) *
    100
  ).toFixed(1);

  // Calculate reference line positions
  const maxBalance = data.maxBalance;
  const minBalance = data.minBalance;
  const centerBalance = (maxBalance + minBalance) / 2;

  return (
    <div>
      {/* Trend Header */}
      <div className="mb-2 flex items-baseline justify-between">
        <Text as="strong" className="font-semibold text-sm">
          Cash Flow
        </Text>
        <Text
          as="span"
          className={`text-xs font-semibold ${
            isIncreasing
              ? "text-[var(--color-success)]"
              : "text-[var(--color-danger)]"
          }`}
        >
          {isIncreasing ? "+" : "-"}
          {Math.abs(parseFloat(changePercentage))}%
        </Text>
      </div>

      {/* Area Chart */}
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart
          data={data.data || []}
          margin={{ top: 10, left: 5, bottom: 10 }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-primary)"
                stopOpacity={0}
              />
              <stop
                offset="95%"
                stopColor="var(--color-primary)"
                stopOpacity={0.25}
              />
            </linearGradient>
          </defs>
          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            width={50}
            tickFormatter={formatYAxisLabel}
            ticks={[maxBalance, centerBalance, minBalance]}
            domain={[minBalance, maxBalance]}
          />
          <ReferenceLine
            y={maxBalance}
            stroke="var(--color-border)"
            strokeDasharray="5 5"
          />
          <ReferenceLine
            y={centerBalance}
            stroke="var(--color-border)"
            strokeDasharray="5 5"
            opacity={0.5}
          />
          <ReferenceLine
            y={minBalance}
            stroke="var(--color-border)"
            strokeDasharray="5 5"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--color-primary)"
            fill="url(#colorBalance)"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
