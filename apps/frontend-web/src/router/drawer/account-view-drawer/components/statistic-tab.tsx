import { useApiAccountStatisticsQuery } from "@/hooks/use-api";
import { AccountModel } from "@/types/schemas";
import dayjs from "dayjs";
import { FC } from "react";
import { AccountsStatisticBudgetHealth } from "@/ui/accounts-statistic-budget-health";
import { AccountsStatisticBurnRate } from "@/ui/accounts-statistic-burn-rate";
import { AccountsStatisticCashFlowPulse } from "@/ui/accounts-statistic-cash-flow-pulse";
import { AccountsStatisticCategoryHeatmap } from "@/ui/accounts-statistic-category-heatmap";
import { AccountsStatisticMonthlyVelocity } from "@/ui/accounts-statistic-monthly-velocity";
import { AccountsStatisticTimeFrequency } from "@/ui/accounts-statistic-time-frequency";
import { When } from "@/lib/when";
import { NoResults, PageLoader } from "@dimasbaguspm/versaur";
import { SearchXIcon } from "lucide-react";

interface StatisticTabProps {
  data: AccountModel;
}

export const StatisticTab: FC<StatisticTabProps> = ({ data }) => {
  const [stats, error, { isPending }] = useApiAccountStatisticsQuery(data.id, {
    startDate: dayjs().startOf("month").subtract(5, "month").toISOString(),
    endDate: dayjs().endOf("month").toISOString(),
  });

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
