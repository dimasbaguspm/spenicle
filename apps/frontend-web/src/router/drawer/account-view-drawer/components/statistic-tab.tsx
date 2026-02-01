import { AccountModel } from "@/types/schemas";
import { FC } from "react";

interface StatisticTabProps {
  data: AccountModel;
}

export const StatisticTab: FC<StatisticTabProps> = () => {
  return (
    <div>
      Statistics Tab
      <ul>
        <li>1. Budget Health</li>
        <li>2. Burn rate</li>
        <li>3. Cash flow pulse (Mini sparkline)</li>
        <li>4. Category Heatmap</li>
        <li>5. Monthly Velocity</li>
        <li>6. Timefrequency Heatmap</li>
      </ul>
    </div>
  );
};
