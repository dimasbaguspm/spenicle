import { memo, type FC } from "react";
import { FormProvider } from "react-hook-form";
import type { TransactionModel } from "@/types/schemas";
import { TransactionsEditTable } from "./transactions-edit-table";
import { EditControls } from "./";
import type { TableColumn } from "@/ui/transactions-virtual-table-base";
import { useTransactionEditForm } from "../hooks/use-transaction-edit-form";

interface TransactionsEditFormProps {
  transactions: TransactionModel[];
  columns: TableColumn[];
  onExitEditMode: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onFetchNextPage?: () => void;
}

/**
 * Clean presentation component for transaction editing
 * Composes: EditControls + EditTable
 * All business logic delegated to useTransactionEditForm hook
 */
export const TransactionsEditForm: FC<TransactionsEditFormProps> = memo(
  ({
    transactions,
    columns,
    onExitEditMode,
    hasNextPage,
    isFetchingNextPage,
    onFetchNextPage,
  }) => {
    const {
      formMethods,
      isDirty,
      isSaving,
      isSaveError,
      accounts,
      categories,
      handleCommit,
      handleCancel,
      isCommitPending,
    } = useTransactionEditForm({ transactions, onExitEditMode });

    return (
      <>
        <EditControls
          isSaving={isSaving}
          isSaveError={isSaveError}
          isDirty={isDirty}
          onCancel={handleCancel}
          onCommit={handleCommit}
          isCommitPending={isCommitPending}
        />

        <FormProvider {...formMethods}>
          <TransactionsEditTable
            transactions={transactions}
            columns={columns}
            accounts={accounts}
            categories={categories}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onFetchNextPage={onFetchNextPage}
          />
        </FormProvider>
      </>
    );
  },
);

TransactionsEditForm.displayName = "TransactionsEditForm";
