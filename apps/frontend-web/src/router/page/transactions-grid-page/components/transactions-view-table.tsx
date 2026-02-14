import { formatDate, DateFormat } from "@/lib/format-date";
import { formatTransactionData } from "@/lib/format-data";
import { When } from "@/lib/when";
import type { TransactionModel } from "@/types/schemas";
import { Badge, Text } from "@dimasbaguspm/versaur";
import { memo, useCallback, type FC } from "react";
import {
  TransactionsVirtualTableBase,
  type TableColumn,
} from "@/ui/transactions-virtual-table-base";

interface TransactionsViewTableProps {
  transactions: TransactionModel[];
  onTransactionClick: (transaction: TransactionModel) => void;
  columns: TableColumn[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onFetchNextPage?: () => void;
}

export const TransactionsViewTable: FC<TransactionsViewTableProps> = memo(
  ({
    transactions,
    onTransactionClick,
    columns,
    hasNextPage,
    isFetchingNextPage,
    onFetchNextPage,
  }) => {
    const renderCell = useCallback(
      (transaction: TransactionModel, columnKey: string) => {
        const {
          variant,
          amount,
          capitalizedType,
          isTransfer,
          relatedAccountName,
          relatedDestinationAccountName,
          relatedCategoryName,
        } = formatTransactionData(transaction);

        switch (columnKey) {
          case "date":
            return (
              <Text as="small" color="black">
                <span className="block overflow-hidden text-ellipsis">
                  {formatDate(transaction.date, DateFormat.MEDIUM_DATE)}
                </span>
              </Text>
            );

          case "time":
            return (
              <Text as="small" color="ghost">
                <span className="block overflow-hidden text-ellipsis">
                  {formatDate(transaction.date, DateFormat.TIME_24H)}
                </span>
              </Text>
            );

          case "type":
            return <Badge color={variant}>{capitalizedType}</Badge>;

          case "account":
            return (
              <Text as="small" color="ghost">
                <span className="block overflow-hidden text-ellipsis">
                  {relatedAccountName}
                </span>
              </Text>
            );

          case "destinationAccount":
            return (
              <Text as="small" color="ghost">
                <span className="block overflow-hidden text-ellipsis">
                  <When condition={isTransfer}>
                    {relatedDestinationAccountName}
                  </When>
                  <When condition={!isTransfer}>—</When>
                </span>
              </Text>
            );

          case "category":
            return (
              <Text as="small" color="ghost">
                <span className="block overflow-hidden text-ellipsis">
                  {relatedCategoryName}
                </span>
              </Text>
            );

          case "amount": {
            return (
              <Text as="small" color="black" fontWeight="medium">
                {amount}
              </Text>
            );
          }

          case "notes":
            return (
              <Text as="small" color="ghost">
                <span className="block whitespace-nowrap overflow-hidden text-ellipsis">
                  {transaction.note || "—"}
                </span>
              </Text>
            );

          default:
            return null;
        }
      },
      [],
    );

    return (
      <TransactionsVirtualTableBase
        transactions={transactions}
        columns={columns}
        renderCell={renderCell}
        onRowClick={onTransactionClick}
        isClickable
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={onFetchNextPage}
      />
    );
  },
);

TransactionsViewTable.displayName = "TransactionsViewTable";
