import { FC } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { CategoryStatisticDayOfWeekPatternModel } from "@/types/schemas";
import { Text } from "@dimasbaguspm/versaur";

interface CategoryStatisticDayOfWeekPatternProps {
  data: CategoryStatisticDayOfWeekPatternModel;
}

const DAY_NAMES: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export const CategoryStatisticDayOfWeekPattern: FC<
  CategoryStatisticDayOfWeekPatternProps
> = ({ data }) => {
  const chartData =
    data.data?.map((day) => ({
      name: DAY_NAMES[day.dayOfWeek.toLowerCase()] || day.dayOfWeek[0],
      transactions: day.transactionCount,
    })) || [];

  return (
    <div>
      <Text as="strong" className="mb-2 block font-semibold text-sm">
        Activity by Day
      </Text>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={false} axisLine={false} width={0} />
          <Bar
            dataKey="transactions"
            fill="var(--color-primary)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
