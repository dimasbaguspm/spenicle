import { FC } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { CategoryStatisticSpendingVelocityModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
import { formatDate, DateFormat } from "@/lib/format-date";
import { formatPrice, PriceFormat } from "@/lib/format-price";

interface CategoryStatisticSpendingVelocityProps {
  data: CategoryStatisticSpendingVelocityModel;
}

const formatMonthLabel = (month: string): string => {
  return formatDate(month, DateFormat.SHORT_MONTH_YEAR);
};

export const CategoryStatisticSpendingVelocity: FC<
  CategoryStatisticSpendingVelocityProps
> = ({ data }) => {
  return (
    <div>
      <Text as="strong" className="mb-2 block font-semibold text-sm">
        Spending Trend
      </Text>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data.data || []}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11 }}
            tickFormatter={formatMonthLabel}
          />
          <YAxis tick={false} axisLine={false} width={0} />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="var(--color-primary)"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <Text as="p" transform="uppercase" className="text-xs">
            Average Monthly
          </Text>
          <Text as="p" className="mt-1 font-semibold">
            {formatPrice(
              data.averageMonthlySpend,
              PriceFormat.CURRENCY_NO_DECIMALS,
            )}
          </Text>
        </div>
      </div>
    </div>
  );
};
