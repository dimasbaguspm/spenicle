import { useApiAccountStatisticsQuery } from "@/hooks/use-api";
import { useStatisticFilter, PERIOD_OPTIONS } from "@/hooks/use-filter-state";
import { AccountModel } from "@/types/schemas";
import { FC } from "react";
import { AccountsStatisticBudgetHealth } from "@/ui/accounts-statistic-budget-health";
import { AccountsStatisticBurnRate } from "@/ui/accounts-statistic-burn-rate";
import { AccountsStatisticCashFlowPulse } from "@/ui/accounts-statistic-cash-flow-pulse";
import { AccountsStatisticCategoryHeatmap } from "@/ui/accounts-statistic-category-heatmap";
import { AccountsStatisticMonthlyVelocity } from "@/ui/accounts-statistic-monthly-velocity";
import { AccountsStatisticTimeFrequency } from "@/ui/accounts-statistic-time-frequency";
import { When } from "@/lib/when";
import { ChipSingleInput, NoResults, PageLoader } from "@dimasbaguspm/versaur";
import { SearchXIcon } from "lucide-react";

interface StatisticTabProps {
  data: AccountModel;
}

export const StatisticTab: FC<StatisticTabProps> = ({ data }) => {
  const filters = useStatisticFilter({ adapter: "state" });
  const periodDates = filters.getPeriodDates();

  const [stats, error, { isPending }] = useApiAccountStatisticsQuery(
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
        <When condition={!error}>
          <When condition={!stats}>
            <NoResults
              icon={SearchXIcon}
              title="No statistics available"
              subtitle="Try again later."
            />
          </When>
          <When condition={!!stats}>
            <div className="mb-4 flex flex-col gap-3">
              <ChipSingleInput
                size="md"
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

            <div className="space-y-6">
              <When condition={!!stats?.budgetHealth}>
                <AccountsStatisticBudgetHealth data={stats?.budgetHealth!} />
              </When>
              <When condition={!!stats?.cashFlowPulse}>
                <AccountsStatisticCashFlowPulse data={stats?.cashFlowPulse!} />
              </When>
              <When condition={!!stats?.timeFrequencyHeatmap}>
                <AccountsStatisticTimeFrequency
                  data={stats?.timeFrequencyHeatmap!}
                />
              </When>

              <When condition={!!stats?.burnRate}>
                <AccountsStatisticBurnRate data={stats?.burnRate!} />
              </When>

              <When condition={!!stats?.categoryHeatmap}>
                <AccountsStatisticCategoryHeatmap
                  data={stats?.categoryHeatmap!}
                />
              </When>
              <When condition={!!stats?.monthlyVelocity}>
                <AccountsStatisticMonthlyVelocity
                  data={stats?.monthlyVelocity!}
                />
              </When>
            </div>
          </When>
        </When>
      </When>
    </>
  );
};
