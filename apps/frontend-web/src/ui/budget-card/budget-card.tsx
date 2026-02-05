import { formatBudgetData } from "@/lib/format-data";
import { When } from "@/lib/when";
import type { BudgetModel } from "@/types/schemas";
import { Badge, BadgeGroup, Card, type CardProps } from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface BudgetCardProps extends Omit<CardProps, "onClick"> {
  budget: BudgetModel;
  onClick?: (budget: BudgetModel) => void;
  hideStatus?: boolean;
  hidePeriod?: boolean;
  hideUtilization?: boolean;
}

export const BudgetCard: FC<BudgetCardProps> = (props) => {
  const { budget, onClick, hideStatus, hidePeriod, hideUtilization, ...rest } =
    props;
  const {
    name,
    periodType,
    periodStart,
    periodEnd,
    formattedAmountLimit,
    statusBadgeColor,
    budgetStatusText,
    utilizationPercent,
    isExpired,
  } = formatBudgetData(budget);

  const handleClick = () => {
    onClick?.(budget);
  };

  const periodLabel = `${periodType} • ${periodStart} - ${periodEnd}`;

  return (
    <Card
      onClick={handleClick}
      title={name}
      subtitle={hideStatus ? periodLabel : undefined}
      badge={
        <BadgeGroup>
          <When condition={!hideStatus}>
            <Badge color={statusBadgeColor}>
              {isExpired ? "Expired" : budgetStatusText}
            </Badge>
          </When>
        </BadgeGroup>
      }
      supplementaryInfo={hideStatus ? formattedAmountLimit : undefined}
      {...rest}
    >
      <When condition={!hideUtilization}>
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {hidePeriod ? "" : `${periodLabel} • `}
            {Math.round(utilizationPercent)}% utilized
          </p>
        </div>
      </When>
    </Card>
  );
};
