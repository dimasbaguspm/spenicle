import { formatTransactionTemplateData } from "@/lib/format-data";
import { When } from "@/lib/when";
import type { TransactionTemplateModel } from "@/types/schemas";
import { Badge, BadgeGroup, Card, type CardProps } from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface TransactionTemplateCardProps extends Omit<CardProps, "onClick"> {
  transactionTemplate: TransactionTemplateModel;
  onClick: (transactionTemplate: TransactionTemplateModel) => void;
  useDateTime?: boolean;
  hideNotesSubtitle?: boolean;
}

export const TransactionTemplateCard: FC<TransactionTemplateCardProps> = ({
  transactionTemplate,
  onClick,
  useDateTime,
  hideNotesSubtitle,
  ...props
}) => {
  const {
    variant,
    amount,
    capitalizedType,
    isInstallment,
    isIncome,
    isExpense,
    isTransfer,
    relatedAccountName,
    relatedDestinationAccountName,
    relatedCategoryName,
    nextRunHumanized,
    nextRunDateTime,
    occurrences,
    remainingOccurrences,
  } = formatTransactionTemplateData(transactionTemplate);

  return (
    <Card
      {...props}
      title={amount}
      onClick={() => onClick(transactionTemplate)}
      subtitle={
        <Card.List>
          <Card.ListItem>{relatedCategoryName}</Card.ListItem>
          <When condition={isIncome || isExpense}>
            <Card.ListItem>{relatedAccountName}</Card.ListItem>
          </When>
          <When condition={isTransfer}>
            <Card.ListItem>
              {relatedAccountName} &rarr; {relatedDestinationAccountName}
            </Card.ListItem>
          </When>
          <When condition={isInstallment}>
            <Card.ListItem>
              {occurrences - remainingOccurrences} of {occurrences} installments
            </Card.ListItem>
          </When>
          <When condition={!isInstallment}>
            <Card.ListItem>{occurrences} occurrences</Card.ListItem>
          </When>
        </Card.List>
      }
      supplementaryInfo={
        useDateTime ? `Next run at ${nextRunDateTime}` : `${nextRunHumanized}`
      }
      badge={
        <BadgeGroup>
          <Badge color={variant}>{capitalizedType}</Badge>
          <Badge color="neutral">
            {isInstallment ? "Installment" : "Recurring"}
          </Badge>
        </BadgeGroup>
      }
    />
  );
};
