import { useEffect, useRef, useMemo } from "react";
import { debounce } from "lodash";
import dayjs from "dayjs";
import { useApiSaveBulkDraft } from "@/hooks/use-api";
import type { BulkEditFormSchema } from "../types";

export interface UseAutoSaveDraftReturn {
  isSaving: boolean;
  isSaveError: boolean;
  saveError: unknown;
  lastSavedAt: Date | null;
}

export const useAutoSaveDraft = (
  formData: BulkEditFormSchema,
  isEditMode: boolean,
  isDirty: boolean,
  onSaveComplete?: () => void,
): UseAutoSaveDraftReturn => {
  const [saveDraft, saveError, { isPending }] = useApiSaveBulkDraft();
  const lastSavedRef = useRef<Date | null>(null);

  const debouncedSave = useMemo(
    () =>
      debounce(() => {
        saveDraft({
          updates: formData.transactions.map((t) => ({
            id: t.id,
            type: t.type,
            date: dayjs(`${t.date} ${t.time}`).toISOString(),
            accountId: +t.accountId,
            destinationAccountId:
              t.type === "transfer" && t.destinationAccountId
                ? +t.destinationAccountId
                : undefined,
            categoryId: +t.categoryId,
            amount: +t.amount,
            note: t.note,
          })),
        }).then(() => {
          lastSavedRef.current = new Date();
          onSaveComplete?.();
        });
      }, 5000),
    [saveDraft, onSaveComplete],
  );

  useEffect(() => {
    if (!isEditMode || !isDirty) {
      return;
    }

    debouncedSave();

    return () => {
      debouncedSave.cancel();
    };
  }, [formData, isEditMode, isDirty, debouncedSave]);

  return {
    isSaving: isPending,
    isSaveError: !!saveError,
    saveError,
    lastSavedAt: lastSavedRef.current,
  };
};
