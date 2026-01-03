import { useBottomSheetProvider } from "@/providers/bottom-sheet-provider";
import { useDrawerProvider } from "@/providers/drawer-provider";
import { useModalProvider } from "@/providers/modal-provider";
import { Button, ButtonGroup, Modal } from "@dimasbaguspm/versaur";
import { startTransition } from "react";

export const LogoutConfirmationModal = () => {
  const { closeModal } = useModalProvider();
  const { closeDrawer, isOpen: isDrawerOpen } = useDrawerProvider();
  const { closeBottomSheet, isOpen: isBottomSheetOpen } =
    useBottomSheetProvider();

  const handleLogout = async () => {
    // await logout();
    startTransition(() => {
      closeModal();
      startTransition(() => {
        if (isDrawerOpen) closeDrawer();
        startTransition(() => {
          if (isBottomSheetOpen) closeBottomSheet();
        });
      });
    });
  };

  return (
    <>
      <Modal.Header>Logout Confirmation</Modal.Header>
      <Modal.Body>Are you sure you want to logout?</Modal.Body>
      <Modal.Footer>
        <ButtonGroup>
          <Button variant="ghost" onClick={closeModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleLogout}>
            Logout
          </Button>
        </ButtonGroup>
      </Modal.Footer>
    </>
  );
};
