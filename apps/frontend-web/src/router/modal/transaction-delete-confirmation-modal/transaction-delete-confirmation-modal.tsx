import { useApiDeleteTransaction } from "@/hooks/use-api";
import { useBottomSheetProvider } from "@/providers/bottom-sheet-provider";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useModalProvider } from "@/providers/modal-provider";
import { Button, ButtonGroup, Modal } from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface TransactionDeleteConfirmationModalProps {
  transactionId: number;
}

export const TransactionDeleteConfirmationModal: FC<
  TransactionDeleteConfirmationModalProps
> = ({ transactionId }) => {
  const { closeModal } = useModalProvider();
  const { closeDrawer, isOpen: isDrawerOpen } = useDrawerProvider();
  const { closeBottomSheet, isOpen: isBottomSheetOpen } =
    useBottomSheetProvider();

  const [deleteTransaction, , { isPending }] = useApiDeleteTransaction();

  const handleDelete = async () => {
    await deleteTransaction({
      id: transactionId,
    });
    closeModal();

    if (isDrawerOpen) closeDrawer();
    if (isBottomSheetOpen) closeBottomSheet();
  };

  return (
    <>
      <Modal.Header>Confirmation</Modal.Header>
      <Modal.Body>Are you sure you want to delete this transaction?</Modal.Body>
      <Modal.Footer>
        <ButtonGroup>
          <Button variant="ghost" onClick={closeModal} busy={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} busy={isPending}>
            Delete
          </Button>
        </ButtonGroup>
      </Modal.Footer>
    </>
  );
};
