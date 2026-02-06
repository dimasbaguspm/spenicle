import { formatBudgetData } from "@/lib/format-data";
import { When } from "@/lib/when";
import type { BudgetModel } from "@/types/schemas";
import { Badge, BadgeGroup, Card, type CardProps } from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface BudgetCardProps extends Omit<CardProps, "onClick"> {
  budget: BudgetModel;
  templateId?: number;
  onClick?: (budget: BudgetModel, templateId?: number) => void;
  hideStatus?: boolean;
}

export const BudgetCard: FC<BudgetCardProps> = (props) => {
  const { budget, templateId, onClick, hideStatus, ...rest } = props;

  const {
    periodStart,
    periodEnd,
    utilizationPercent,
    statusBadgeColor,
    isActive,
    budgetStatusText,
    formattedActualAmount,
    formattedAmountLimit,
    isExpired,
  } = formatBudgetData(budget);

  const handleClick = () => {
    onClick?.(budget, templateId);
  };

  const statusText = isExpired ? "Expired" : "Active";

  return (
    <Card
      title={`${periodStart} until ${periodEnd}`}
      subtitle={
        <Card.List>
          <Card.ListItem>Limit: {formattedAmountLimit}</Card.ListItem>
          <Card.ListItem>Used: {formattedActualAmount}</Card.ListItem>
        </Card.List>
      }
      badge={
        <BadgeGroup>
          <When condition={!hideStatus}>
            <Badge color={isActive ? "accent_2" : "neutral"}>
              {statusText}
            </Badge>
          </When>
          <Badge color={statusBadgeColor}>
            {budgetStatusText} ({Math.round(utilizationPercent)}%){" "}
          </Badge>
        </BadgeGroup>
      }
      onClick={handleClick}
      {...rest}
    />
  );
};
