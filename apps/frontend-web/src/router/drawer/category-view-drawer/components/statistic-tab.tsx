import { useApiCategoryStatisticsQuery } from "@/hooks/use-api";
import { useStatisticFilter, PERIOD_OPTIONS } from "@/hooks/use-filter-state";
import { CategoryModel } from "@/types/schemas";
import { FC } from "react";
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

export const StatisticTab: FC<StatisticTabProps> = ({ data }) => {
  const filters = useStatisticFilter({ adapter: "state" });
  const periodDates = filters.getPeriodDates();

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
                value={filters.appliedFilters.period || "3months"}
                onChange={(value) =>
                  filters.replaceSingle("period", value as string)
                }
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
              <When condition={!!stats.budgetUtilization}>
                <CategoryStatisticBudgetUtilization
                  data={stats.budgetUtilization!}
                />
              </When>

              <When condition={!!stats.spendingVelocity}>
                <CategoryStatisticSpendingVelocity
                  data={stats.spendingVelocity!}
                />
              </When>

              <When condition={!!stats.averageTransactionSize}>
                <CategoryStatisticAverageTransactionSize
                  data={stats.averageTransactionSize!}
                />
              </When>

              <When condition={!!stats.accountDistribution}>
                <CategoryStatisticAccountDistribution
                  data={stats.accountDistribution!}
                />
              </When>

              <When condition={!!stats.dayOfWeekPattern}>
                <CategoryStatisticDayOfWeekPattern
                  data={stats.dayOfWeekPattern!}
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
