import { useApiAccountStatisticsQuery } from "@/hooks/use-api";
import { AccountModel } from "@/types/schemas";
import dayjs from "dayjs";
import { FC, useState } from "react";
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

type PeriodOption = "3months" | "6months" | "1year";

const PERIOD_OPTIONS: { value: PeriodOption; label: string }[] = [
  { value: "3months", label: "Last 3 Months" },
  { value: "6months", label: "Last Semester" },
  { value: "1year", label: "Last Year" },
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
