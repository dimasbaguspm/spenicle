import { FC } from "react";
import {
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { CategoryStatisticSpendingVelocityModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
import { formatDate, DateFormat } from "@/lib/format-date";
import { formatPrice, PriceFormat } from "@/lib/format-price";

interface CategoryStatisticSpendingVelocityProps {
  data: CategoryStatisticSpendingVelocityModel;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-white p-2 shadow-sm">
        <p className="text-xs font-semibold text-[var(--color-foreground-bold)]">
          {formatDate(data.month, DateFormat.DAY_MONTH_YEAR)}
        </p>
        <p className="text-xs text-[var(--color-foreground-light)]">
          {formatPrice(data.amount, PriceFormat.COMPACT_CURRENCY)}
        </p>
      </div>
    );
  }
  return null;
};

export const CategoryStatisticSpendingVelocity: FC<
  CategoryStatisticSpendingVelocityProps
> = ({ data }) => {
  // Calculate reference line positions
  const amounts = data.data?.map((d) => d.amount) || [];
  const maxAmount = Math.max(...amounts, 0);
  const minAmount = Math.min(...amounts, 0);
  const centerAmount = (maxAmount + minAmount) / 2;

  const formatYAxisLabel = (value: number): string => {
    return formatPrice(value, PriceFormat.COMPACT_CURRENCY);
  };

  return (
    <div>
      <Text as="strong" className="mb-2 block font-semibold text-sm">
        Spending Trend
      </Text>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={data.data || []}
          margin={{ top: 10, left: 5, bottom: 10 }}
        >
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="var(--color-primary)"
                stopOpacity={0}
              />
              <stop
                offset="95%"
                stopColor="var(--color-primary)"
                stopOpacity={0.15}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            width={50}
            ticks={[maxAmount, centerAmount, minAmount]}
            domain={[minAmount, maxAmount]}
            tickFormatter={formatYAxisLabel}
          />
          <ReferenceLine
            y={maxAmount}
            stroke="var(--color-border)"
            strokeDasharray="5 5"
          />
          <ReferenceLine
            y={centerAmount}
            stroke="var(--color-border)"
            strokeDasharray="5 5"
            opacity={0.5}
          />
          <ReferenceLine
            y={minAmount}
            stroke="var(--color-border)"
            strokeDasharray="5 5"
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="var(--color-primary)"
            fill="url(#colorAmount)"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
