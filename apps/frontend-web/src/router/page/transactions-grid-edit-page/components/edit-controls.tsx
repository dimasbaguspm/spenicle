import { memo, type FC } from "react";
import { Button, ButtonGroup, Icon, Text } from "@dimasbaguspm/versaur";
import { XIcon, CheckIcon } from "lucide-react";

interface EditControlsProps {
  isSaving: boolean;
  isSaveError: boolean;
  isDirty: boolean;

  onCancel: () => void;
  onCommit: () => void;

  isCommitPending: boolean;
}

/**
 * Edit mode controls - status bar with save/cancel buttons
 * Similar pattern to ActionsControl - focused responsibility
 */
export const EditControls: FC<EditControlsProps> = memo(
  ({ isSaving, isSaveError, isDirty, onCancel, onCommit, isCommitPending }) => {
    const statusText = isSaving
      ? "Saving to draft..."
      : isSaveError
        ? "Save failed"
        : isDirty
          ? "Unsaved changes (will auto-save in 5s)"
          : "All changes saved to draft";

    const commitButtonTitle = isDirty
      ? "Changes are being saved to draft..."
      : isSaving
        ? "Waiting for auto-save to complete..."
        : "Commit all changes from draft";

    return (
      <div className="bg-background border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Text as="small" color="ghost">
            {statusText}
          </Text>
        </div>

        <ButtonGroup>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isCommitPending}
          >
            <Icon as={XIcon} color="inherit" size="sm" />
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onCommit}
            disabled={isSaving || isCommitPending}
            title={commitButtonTitle}
          >
            <Icon as={CheckIcon} color="inherit" size="sm" />
            {isCommitPending ? "Committing..." : "Save All Changes"}
          </Button>
        </ButtonGroup>
      </div>
    );
  },
);

EditControls.displayName = "EditControls";
