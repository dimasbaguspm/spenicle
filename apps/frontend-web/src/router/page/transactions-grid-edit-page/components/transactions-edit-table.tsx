import { memo, useCallback, type FC } from "react";
import type {
  TransactionModel,
  AccountModel,
  CategoryModel,
} from "@/types/schemas";
import {
  EditableDateCell,
  EditableTimeCell,
  EditableTypeCell,
  EditableAmountCell,
  EditableNotesCell,
} from ".";
import { EditableAccountCell } from ".";
import { EditableCategoryCell } from ".";
import { EditableDestinationAccountCell } from "./destination-account-select-cell";
import {
  TransactionsVirtualTableBase,
  type TableColumn,
} from "@/ui/transactions-virtual-table-base";

interface TransactionsEditTableProps {
  transactions: TransactionModel[];
  columns: TableColumn[];
  accounts: AccountModel[];
  categories: CategoryModel[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onFetchNextPage?: () => void;
}

export const TransactionsEditTable: FC<TransactionsEditTableProps> = memo(
  ({
    transactions,
    columns,
    accounts,
    categories,
    hasNextPage,
    isFetchingNextPage,
    onFetchNextPage,
  }) => {
    const renderCell = useCallback(
      (_transaction: TransactionModel, columnKey: string, rowIndex: number) => {
        switch (columnKey) {
          case "date":
            return <EditableDateCell index={rowIndex} />;
          case "time":
            return <EditableTimeCell index={rowIndex} />;
          case "type":
            return <EditableTypeCell index={rowIndex} />;
          case "account":
            return <EditableAccountCell index={rowIndex} accounts={accounts} />;
          case "destinationAccount":
            return (
              <EditableDestinationAccountCell
                index={rowIndex}
                accounts={accounts}
              />
            );
          case "category":
            return (
              <EditableCategoryCell index={rowIndex} categories={categories} />
            );
          case "amount":
            return <EditableAmountCell index={rowIndex} />;
          case "notes":
            return <EditableNotesCell index={rowIndex} />;
          default:
            return null;
        }
      },
      [accounts, categories],
    );

    return (
      <TransactionsVirtualTableBase
        transactions={transactions}
        columns={columns}
        renderCell={renderCell}
        isClickable={false}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={onFetchNextPage}
      />
    );
  },
);

TransactionsEditTable.displayName = "TransactionsEditTable";
