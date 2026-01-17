import { formatTransactionData } from "@/lib/format-data";
import { When } from "@/lib/when";
import type { TransactionModel } from "@/types/schemas";
import { Badge, BadgeGroup, Card, type CardProps } from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface TransactionCardProps extends Omit<CardProps, "onClick"> {
  transaction: TransactionModel;
  onClick: (transaction: TransactionModel) => void;
  useDateTime?: boolean;
  hideNotesSubtitle?: boolean;
}

export const TransactionCard: FC<TransactionCardProps> = ({
  transaction,
  onClick,
  useDateTime,
  hideNotesSubtitle,
  ...props
}) => {
  const {
    variant,
    amount,
    capitalizedType,
    dateTime,
    time,
    trimmedNotes,
    isIncome,
    isExpense,
    isTransfer,
    relatedAccountName,
    relatedDestinationAccountName,
    relatedCategoryName,
  } = formatTransactionData(transaction);

  return (
    <Card
      {...props}
      title={amount}
      onClick={() => onClick(transaction)}
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
          <When condition={[!!trimmedNotes.length, !hideNotesSubtitle]}>
            <Card.ListItem>{trimmedNotes}</Card.ListItem>
          </When>
        </Card.List>
      }
      supplementaryInfo={useDateTime ? dateTime : time}
      badge={
        <BadgeGroup>
          <Badge color={variant}>{capitalizedType}</Badge>
        </BadgeGroup>
      }
    />
  );
};
