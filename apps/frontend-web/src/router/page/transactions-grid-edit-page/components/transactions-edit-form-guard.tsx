import { memo, useState, useEffect, type FC, type ReactNode } from "react";
import type { TransactionModel } from "@/types/schemas";
import {
  useApiGetBulkDraft,
  useApiSaveBulkDraft,
  useApiDeleteBulkDraft,
} from "@/hooks/use-api";
import { PageLoader, Text, Button, useSnackbars } from "@dimasbaguspm/versaur";
import { FileEditIcon, FileX2Icon } from "lucide-react";

interface TransactionsEditFormGuardProps {
  transactions: TransactionModel[];
  onExitEditMode: () => void;
  children: ReactNode;
}

type GuardState = "checking" | "confirm_draft" | "creating_draft" | "ready";

/**
 * Guard component that handles draft initialization with user confirmation
 *
 * Flow:
 * 1. Check if draft exists
 * 2. If draft exists: Show confirmation UI (Continue vs Start Fresh)
 * 3. If no draft OR user chooses "Start Fresh": Create initial draft
 * 4. Once draft ready: Render children
 */
export const TransactionsEditFormGuard: FC<TransactionsEditFormGuardProps> =
  memo(({ transactions, onExitEditMode, children }) => {
    const { showSnack } = useSnackbars();
    const [state, setState] = useState<GuardState>("checking");

    const [draftData] = useApiGetBulkDraft();
    const [saveDraft, , { isPending: isSavingDraft }] = useApiSaveBulkDraft();
    const [deleteDraft] = useApiDeleteBulkDraft();

    // Check for existing draft on mount
    useEffect(() => {
      if (state === "checking") {
        if (draftData?.updates && draftData.updates.length > 0) {
          setState("confirm_draft");
        } else {
          createInitialDraft();
        }
      }
    }, [draftData, state]);

    const createInitialDraft = async () => {
      if (transactions.length === 0) return;

      setState("creating_draft");
      try {
        const updates = transactions.map((t) => ({
          id: t.id,
          date: new Date(t.date).toISOString(),
          type: t.type,
          accountId: t.account.id,
          destinationAccountId: t.destinationAccount?.id,
          categoryId: t.category.id,
          amount: t.amount,
          note: t.note || "",
        }));

        await saveDraft({ updates });
        setState("ready");
      } catch (err) {
        console.error("Failed to create initial draft:", err);
        showSnack("danger", "Failed to initialize edit mode");
        onExitEditMode();
      }
    };

    const handleContinueWithDraft = () => {
      setState("ready");
    };

    const handleStartFresh = async () => {
      setState("creating_draft");
      try {
        // Delete old draft
        await deleteDraft();
        await createInitialDraft();
      } catch (err) {
        console.error("Failed to start fresh:", err);
        showSnack("danger", "Failed to create new draft");
        onExitEditMode();
      }
    };

    if (state === "checking") {
      return (
        <div className="h-[calc(100dvh-200px)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <PageLoader />
            <Text color="ghost">Checking for unsaved changes...</Text>
          </div>
        </div>
      );
    }

    if (state === "confirm_draft") {
      return (
        <div className="h-[calc(100dvh-200px)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-6 max-w-md text-center">
            <FileEditIcon className="w-16 h-16 text-gray-400" />
            <div className="flex flex-col gap-2">
              <Text fontWeight="medium" className="text-lg">
                You have unsaved changes
              </Text>
              <Text color="ghost">
                {draftData?.updates?.length || 0} transactions were previously
                edited. Would you like to continue editing or start fresh?
              </Text>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleStartFresh}
                disabled={isSavingDraft}
              >
                <FileX2Icon className="w-4 h-4" />
                Start Fresh
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={handleContinueWithDraft}
              >
                <FileEditIcon className="w-4 h-4" />
                Continue Editing
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (state === "creating_draft" || isSavingDraft) {
      return (
        <div className="h-[calc(100dvh-200px)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <PageLoader />
            <Text color="ghost">Preparing edit mode...</Text>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  });

TransactionsEditFormGuard.displayName = "TransactionsEditFormGuard";
