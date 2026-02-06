import { formatBudgetTemplateData } from "@/lib/format-data";
import type { BudgetTemplateModel } from "@/types/schemas";
import { Card, type CardProps } from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface BudgetTemplateCardProps extends Omit<CardProps, "onClick"> {
  budgetTemplate: BudgetTemplateModel;
  onClick?: (budgetTemplate: BudgetTemplateModel) => void;
  hideActive?: boolean;
}

export const BudgetTemplateCard: FC<BudgetTemplateCardProps> = (props) => {
  const { budgetTemplate, onClick, hideActive, ...rest } = props;

  const { name, recurrenceLabel, formattedAmountLimit, nextRunAt } =
    formatBudgetTemplateData(budgetTemplate);

  const handleClick = () => {
    onClick?.(budgetTemplate);
  };

  return (
    <Card
      onClick={handleClick}
      title={name}
      subtitle={
        <Card.List>
          <Card.ListItem>{recurrenceLabel}</Card.ListItem>
          <Card.ListItem>{formattedAmountLimit}</Card.ListItem>
        </Card.List>
      }
      supplementaryInfo={`Next run at: ${nextRunAt}`}
      {...rest}
    />
  );
};
