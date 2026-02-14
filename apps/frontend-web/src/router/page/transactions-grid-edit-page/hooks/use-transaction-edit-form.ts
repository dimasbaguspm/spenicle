import { useEffect, useRef, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import type {
  TransactionModel,
  AccountModel,
  CategoryModel,
} from "@/types/schemas";
import type { BulkEditFormSchema } from "../types";
import { DateFormat, formatDate } from "@/lib/format-date";
import { useAutoSaveDraft } from "./use-auto-save-draft";
import {
  useApiCommitBulkDraft,
  useApiAccountsInfiniteQuery,
  useApiCategoriesInfiniteQuery,
} from "@/hooks/use-api";
import { useSnackbars } from "@dimasbaguspm/versaur";

interface UseTransactionEditFormProps {
  transactions: TransactionModel[];
  onExitEditMode: () => void;
}

interface UseTransactionEditFormReturn {
  formMethods: ReturnType<typeof useForm<BulkEditFormSchema>>;
  isDirty: boolean;
  isSaving: boolean;
  isSaveError: boolean;

  // Data for select inputs
  accounts: AccountModel[];
  categories: CategoryModel[];

  // Handlers
  handleCommit: () => Promise<void>;
  handleCancel: () => void;

  // Loading states
  isCommitPending: boolean;
}

/**
 * Custom hook to manage transaction edit form logic
 * Encapsulates: form state, draft management, auto-save, handlers
 */
export const useTransactionEditForm = ({
  transactions,
  onExitEditMode,
}: UseTransactionEditFormProps): UseTransactionEditFormReturn => {
  const { showSnack } = useSnackbars();
  const hasResetOnMount = useRef(false);
  const previousTransactionCount = useRef(0);

  // Fetch accounts and categories once at top level
  const [accounts] = useApiAccountsInfiniteQuery({
    pageSize: 100,
    sortBy: "name",
    sortOrder: "asc",
  });

  const [categories] = useApiCategoriesInfiniteQuery({
    pageSize: 100,
    sortBy: "name",
    sortOrder: "asc",
  });

  const [commitDraft, , { isPending: isCommitPending }] =
    useApiCommitBulkDraft();

  // Form setup
  const formMethods = useForm<BulkEditFormSchema>({
    mode: "onBlur",
    defaultValues: {
      transactions: transactions.map((t) => ({
        id: t.id,
        date: formatDate(new Date(t.date), DateFormat.ISO_DATE),
        time: formatDate(new Date(t.date), DateFormat.TIME_24H),
        type: t.type,
        accountId: t.account.id,
        destinationAccountId: t.destinationAccount?.id,
        categoryId: t.category.id,
        amount: t.amount,
        note: t.note || "",
      })),
    },
  });

  const {
    control,
    reset,
    formState: { isDirty },
    trigger,
  } = formMethods;

  const formValues = useWatch({ control });

  // Callback to reset dirty state after auto-save completes
  const handleSaveComplete = useCallback(() => {
    reset(formValues as BulkEditFormSchema, { keepValues: true });
  }, [formValues, reset]);

  const { isSaving, isSaveError } = useAutoSaveDraft(
    formValues as BulkEditFormSchema,
    true,
    isDirty,
    handleSaveComplete,
  );

  // Handle form initialization and updates when transactions change
  useEffect(() => {
    const currentCount = transactions.length;
    const previousCount = previousTransactionCount.current;

    if (currentCount === 0) return;

    const mapTransaction = (t: TransactionModel) => ({
      id: t.id,
      date: formatDate(new Date(t.date), DateFormat.ISO_DATE),
      time: formatDate(new Date(t.date), DateFormat.TIME_24H),
      type: t.type,
      accountId: t.account.id,
      destinationAccountId: t.destinationAccount?.id,
      categoryId: t.category.id,
      amount: t.amount,
      note: t.note || "",
    });

    // Initial mount - reset entire form
    if (!hasResetOnMount.current) {
      reset({
        transactions: transactions.map(mapTransaction),
      });
      hasResetOnMount.current = true;
      previousTransactionCount.current = currentCount;
      return;
    }

    // Infinite scroll - append new transactions
    if (currentCount > previousCount) {
      const newTransactions = transactions.slice(previousCount);
      const currentFormValues = formMethods.getValues("transactions") || [];

      reset(
        {
          transactions: [
            ...currentFormValues,
            ...newTransactions.map(mapTransaction),
          ],
        },
        { keepDirty: true }, // Preserve dirty state for existing fields
      );
      previousTransactionCount.current = currentCount;
    }
  }, [transactions, reset, formMethods]);

  // Handlers
  const handleCommit = useCallback(async () => {
    if (isSaving) {
      showSnack("warning", "Please wait for changes to be saved");
      return;
    }

    const isValid = await trigger();
    if (!isValid) {
      showSnack("warning", "Please fix validation errors before saving");
      return;
    }

    try {
      await commitDraft();
      showSnack("success", "All changes saved");
      onExitEditMode();
    } catch (err) {
      showSnack("danger", "Failed to save changes");
      console.error("Commit error:", err);
    }
  }, [isSaving, trigger, showSnack, commitDraft, onExitEditMode]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Discard them?")) {
        onExitEditMode();
        showSnack("info", "Changes discarded");
      }
    } else {
      onExitEditMode();
    }
  }, [isDirty, onExitEditMode, showSnack]);

  return {
    // Form
    formMethods,
    isDirty,
    isSaving,
    isSaveError,

    // Data for select inputs
    accounts: accounts ?? [],
    categories: categories ?? [],

    // Handlers
    handleCommit,
    handleCancel,

    // Loading
    isCommitPending,
  };
};
