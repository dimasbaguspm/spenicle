import { formatBudgetTemplateData } from "@/lib/format-data";
import { When } from "@/lib/when";
import type { BudgetTemplateModel } from "@/types/schemas";
import { Badge, BadgeGroup, Card, type CardProps } from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface BudgetTemplateCardProps extends Omit<CardProps, "onClick"> {
  budget: BudgetTemplateModel;
  onClick?: (budget: BudgetTemplateModel) => void;
}

export const BudgetTemplateCard: FC<BudgetTemplateCardProps> = (props) => {
  const { budget, onClick, ...rest } = props;
  const {
    name,
    recurrenceLabel,
    formattedAmountLimit,
    activeBadgeColor,
    activeText,
    nextRunAt,
  } = formatBudgetTemplateData(budget);

  const handleClick = () => {
    onClick?.(budget);
  };

  const subtitle = `${recurrenceLabel} • ${formattedAmountLimit}`;

  return (
    <Card
      onClick={handleClick}
      title={name}
      subtitle={subtitle}
      badge={
        <BadgeGroup>
          <Badge color={activeBadgeColor}>{activeText}</Badge>
        </BadgeGroup>
      }
      {...rest}
    >
      <When condition={!!nextRunAt}>
        <p className="text-xs text-muted-foreground">Next run: {nextRunAt}</p>
      </When>
    </Card>
  );
};
