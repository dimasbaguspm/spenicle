import { Modal } from "@dimasbaguspm/versaur";

import { useModalProvider } from "@/providers/modal-provider";
import { MODAL_ROUTES } from "@/constant/modal-routes";
import { LogoutConfirmationModal } from "./logout-confirmation-modal";

interface ModalParams {
  accountId?: number;
}

interface ModalState {
  payload?: Record<string, string>;
  returnToModal?: string;
  returnToModalId?: Record<string, string> | null;
}

export const ModalRouter = () => {
  const { isOpen, modalId, closeModal } = useModalProvider<
    ModalParams,
    ModalState
  >();

  const is = (id: string) => modalId === id;
  //   const hasParam = (param: keyof typeof params) =>
  //     params && typeof params === "object" ? param in params : false;
  // const hasState = (stateKey: keyof typeof state) => (state && typeof state === 'object' ? stateKey in state : false);

  return (
    <Modal isOpen={isOpen} onClose={closeModal} size="lg">
      {is(MODAL_ROUTES.LOGOUT_CONFIRMATION) && <LogoutConfirmationModal />}
    </Modal>
  );
};
