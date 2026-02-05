import { useApiUpdateBudget } from "@/hooks/use-api";
import { useBottomSheetProvider } from "@/providers/bottom-sheet-provider";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useModalProvider } from "@/providers/modal-provider";
import { Button, ButtonGroup, Modal } from "@dimasbaguspm/versaur";
import type { FC } from "react";

interface BudgetDeactivateConfirmationModalProps {
  budgetId: number;
  budgetName?: string;
}

export const BudgetDeactivateConfirmationModal: FC<
  BudgetDeactivateConfirmationModalProps
> = ({ budgetId, budgetName }) => {
  const { closeModal } = useModalProvider();
  const { closeDrawer, isOpen: isDrawerOpen } = useDrawerProvider();
  const { closeBottomSheet, isOpen: isBottomSheetOpen } =
    useBottomSheetProvider();

  const [updateBudget, , { isPending }] = useApiUpdateBudget();

  const handleDeactivate = async () => {
    await updateBudget({
      id: budgetId,
      active: false,
    });
    closeModal();

    if (isDrawerOpen) closeDrawer();
    if (isBottomSheetOpen) closeBottomSheet();
  };

  return (
    <>
      <Modal.Header>Confirmation</Modal.Header>
      <Modal.Body>
        Are you sure you want to deactivate the budget{" "}
        {budgetName ? `"${budgetName}"` : ""}? It will stop generating new
        budget records.
      </Modal.Body>
      <Modal.Footer>
        <ButtonGroup>
          <Button variant="ghost" onClick={closeModal} busy={isPending}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleDeactivate}
            busy={isPending}
          >
            Deactivate
          </Button>
        </ButtonGroup>
      </Modal.Footer>
    </>
  );
};
