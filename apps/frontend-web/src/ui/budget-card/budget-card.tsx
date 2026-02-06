import { formatBudgetData } from "@/lib/format-data";
import type { BudgetModel } from "@/types/schemas";
import { Badge, BadgeGroup, Card, type CardProps } from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface BudgetCardProps extends Omit<CardProps, "onClick"> {
  budget: BudgetModel;
  templateId?: number;
  onClick?: (budget: BudgetModel, templateId?: number) => void;
}

export const BudgetCard: FC<BudgetCardProps> = (props) => {
  const { budget, templateId, onClick, ...rest } = props;
  const {
    name,
    periodStart,
    periodEnd,
    utilizationPercent,
    budgetStatusText,
    statusBadgeColor,
    formattedActualAmount,
    formattedAmountLimit,
    isExpired,
  } = formatBudgetData(budget);

  const subtitle = `${periodStart} — ${periodEnd}`;
  const statusText = isExpired ? "Expired" : "Active";
  const clampedPercent = Math.min(utilizationPercent, 100);

  const progressColor =
    statusBadgeColor === "danger"
      ? "bg-[var(--color-danger)]"
      : statusBadgeColor === "warning"
        ? "bg-[var(--color-warning)]"
        : statusBadgeColor === "success"
          ? "bg-[var(--color-success)]"
          : "bg-[var(--color-neutral)]";

  const handleClick = () => {
    onClick?.(budget, templateId);
  };

  return (
    <Card
      title={name}
      subtitle={subtitle}
      badge={
        <BadgeGroup>
          <Badge color={statusBadgeColor}>{statusText}</Badge>
        </BadgeGroup>
      }
      onClick={handleClick}
      {...rest}
    >
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formattedActualAmount} / {formattedAmountLimit}</span>
          <span>{Math.round(utilizationPercent)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-neutral-soft)]">
          <div
            className={`h-full transition-all ${progressColor}`}
            style={{ width: `${clampedPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{budgetStatusText}</p>
      </div>
    </Card>
  );
};
