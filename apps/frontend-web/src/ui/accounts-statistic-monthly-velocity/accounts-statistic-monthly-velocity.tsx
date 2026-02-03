import { FC } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { AccountStatisticMonthlyVelocityModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";
import { formatDate, DateFormat } from "@/lib/format-date";

interface AccountsStatisticMonthlyVelocityProps {
  data: AccountStatisticMonthlyVelocityModel;
}

const formatPeriodLabel = (period: string): string => {
  // Format "2026-02" to "Feb 26"
  return formatDate(period, DateFormat.SHORT_MONTH_YEAR);
};

export const AccountsStatisticMonthlyVelocity: FC<
  AccountsStatisticMonthlyVelocityProps
> = ({ data }) => {
  return (
    <div>
      <Text as="strong" className="font-semibold text-sm">
        Monthly Velocity
      </Text>

      {/* Compact Bar Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.data || []}>
          <XAxis
            dataKey="period"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickFormatter={formatPeriodLabel}
          />
          <YAxis tick={false} axisLine={false} width={0} />
          <ReferenceLine
            y={data.averageMonthlySpend}
            stroke="var(--color-border)"
            strokeDasharray="5 5"
            opacity={1}
          />
          <Bar dataKey="incomeAmount" fill="var(--color-primary)" stackId="a" />
          <Bar
            dataKey="expenseAmount"
            fill="var(--color-primary)"
            stackId="a"
            opacity={0.7}
          />
          <Bar
            dataKey="transferAmount"
            fill="var(--color-primary)"
            stackId="a"
            opacity={0.4}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
