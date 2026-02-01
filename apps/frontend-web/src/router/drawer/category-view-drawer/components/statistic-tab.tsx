import { CategoryModel } from "@/types/schemas";
import { FC } from "react";

interface StatisticTabProps {
  data: CategoryModel;
}

export const StatisticTab: FC<StatisticTabProps> = () => {
  return (
    <div>
      Statistics Tab
      <ul>
        <li>
          Spending Velocity (Line Chart): Show the trend of this category over
          the last 3-6 months.
        </li>
        <li>
          2. Account Distribution (Donut Chart): Which accounts are used to pay
          for this category? (e.g., "I pay for 90% of Food with Credit Cards,
          10% Cash").
        </li>
        <li>
          3. Average Transaction Size: Are your "Jajan" expenses usually Rp 20k
          or Rp 200k?
        </li>
        <li>
          4. Day-of-Week Pattern: Do you spend on "Entertainment" mostly on
          Fridays?
        </li>
        <li>
          5. Budget Utilization: Since budgets are often tied to categories,
          this is the #1 place to show the "Remaining" progress bar. 5. Budget
          Utilization: Since budgets are often tied to categories, this is the
          #1 place to show the "Remaining" progress bar.
        </li>
      </ul>
    </div>
  );
};
