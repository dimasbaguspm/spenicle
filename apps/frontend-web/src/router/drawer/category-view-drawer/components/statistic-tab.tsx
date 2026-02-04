import { useApiCategoryStatisticsQuery } from "@/hooks/use-api";
import { CategoryModel } from "@/types/schemas";
import dayjs from "dayjs";
import { FC, useState } from "react";
import { CategoryStatisticSpendingVelocity } from "@/ui/category-statistic-spending-velocity";
import { CategoryStatisticAccountDistribution } from "@/ui/category-statistic-account-distribution";
import { CategoryStatisticAverageTransactionSize } from "@/ui/category-statistic-average-transaction-size";
import { CategoryStatisticDayOfWeekPattern } from "@/ui/category-statistic-day-of-week-pattern";
import { CategoryStatisticBudgetUtilization } from "@/ui/category-statistic-budget-utilization";
import { When } from "@/lib/when";
import { ChipSingleInput, NoResults, PageLoader } from "@dimasbaguspm/versaur";
import { SearchXIcon } from "lucide-react";

interface StatisticTabProps {
  data: CategoryModel;
}

type PeriodOption = "3months" | "6months" | "1year";

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: "3months", label: "3M" },
  { value: "6months", label: "6M" },
  { value: "1year", label: "1Y" },
];

const getPeriodDates = (period: PeriodOption) => {
  const endDate = dayjs().endOf("month");
  let startDate: dayjs.Dayjs;

  switch (period) {
    case "3months":
      startDate = dayjs().startOf("month").subtract(2, "month");
      break;
    case "6months":
      startDate = dayjs().startOf("month").subtract(5, "month");
      break;
    case "1year":
      startDate = dayjs().startOf("month").subtract(11, "month");
      break;
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

export const StatisticTab: FC<StatisticTabProps> = ({ data }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("3months");
  const periodDates = getPeriodDates(selectedPeriod);

  const [stats, error, { isPending }] = useApiCategoryStatisticsQuery(
    data.id,
    periodDates,
  );

  return (
    <>
      <When condition={isPending}>
        <PageLoader />
      </When>
      <When condition={!isPending}>
        <When condition={error}>
          <NoResults icon={SearchXIcon} title="Unable to load statistics" />
        </When>
        {!error && stats && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <ChipSingleInput
                size="sm"
                name="period"
                value={selectedPeriod}
                onChange={(value) => setSelectedPeriod(value as PeriodOption)}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <ChipSingleInput.Option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </ChipSingleInput.Option>
                ))}
              </ChipSingleInput>
            </div>

            <div className="space-y-4">
              <When condition={!!stats.spendingVelocity}>
                <CategoryStatisticSpendingVelocity
                  data={stats.spendingVelocity!}
                />
              </When>

              <When condition={!!stats.accountDistribution}>
                <CategoryStatisticAccountDistribution
                  data={stats.accountDistribution!}
                />
              </When>

              <When condition={!!stats.averageTransactionSize}>
                <CategoryStatisticAverageTransactionSize
                  data={stats.averageTransactionSize!}
                />
              </When>

              <When condition={!!stats.dayOfWeekPattern}>
                <CategoryStatisticDayOfWeekPattern
                  data={stats.dayOfWeekPattern!}
                />
              </When>

              <When condition={!!stats.budgetUtilization}>
                <CategoryStatisticBudgetUtilization
                  data={stats.budgetUtilization!}
                />
              </When>
            </div>
          </div>
        )}
        <When condition={!error && !stats}>
          <NoResults
            icon={SearchXIcon}
            title="No data"
            subtitle="Try a different period."
          />
        </When>
      </When>
    </>
  );
};
