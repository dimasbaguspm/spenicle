import { Modal } from "@dimasbaguspm/versaur";

import { useModalProvider } from "@/providers/modal-provider";
import { MODAL_ROUTES } from "@/constant/modal-routes";
import { LogoutConfirmationModal } from "./logout-confirmation-modal";
import { AccountDeleteConfirmationModal } from "./account-delete-confirmation-modal";
import { CategoryDeleteConfirmationModal } from "./category-delete-confirmation-modal";
import { TransactionDeleteConfirmationModal } from "./transaction-delete-confirmation-modal";
import { TransactionTemplateDeleteConfirmationModal } from "./transaction-template-delete-confirmation-modal";
import { BudgetDeactivateConfirmationModal } from "./budget-delete-confirmation-modal";

interface ModalParams {
  accountId?: number;
  categoryId?: number;
  budgetId?: number;
  transactionId?: number;
  transactionTemplateId?: number;
  budgetName?: string;
}

interface ModalState {
  payload?: Record<string, string>;
  returnToModal?: string;
  returnToModalId?: Record<string, string> | null;
}

export const ModalRouter = () => {
  const { isOpen, modalId, params, closeModal } = useModalProvider<
    ModalParams,
    ModalState
  >();

  const is = (id: string) => modalId === id;
  const hasParam = (param: keyof typeof params) =>
    params && typeof params === "object" ? param in params : false;
  // const hasState = (stateKey: keyof typeof state) => (state && typeof state === 'object' ? stateKey in state : false);

  return (
    <Modal isOpen={isOpen} onClose={closeModal} size="lg">
      {is(MODAL_ROUTES.LOGOUT_CONFIRMATION) && <LogoutConfirmationModal />}
      {is(MODAL_ROUTES.ACCOUNT_DELETE_CONFIRMATION) &&
        hasParam("accountId") && (
          <AccountDeleteConfirmationModal accountId={params.accountId!} />
        )}
      {is(MODAL_ROUTES.CATEGORY_DELETE_CONFIRMATION) &&
        hasParam("categoryId") && (
          <CategoryDeleteConfirmationModal categoryId={params.categoryId!} />
        )}
      {is(MODAL_ROUTES.TRANSACTION_DELETE_CONFIRMATION) &&
        hasParam("transactionId") && (
          <TransactionDeleteConfirmationModal
            transactionId={params.transactionId!}
          />
        )}
      {is(MODAL_ROUTES.TRANSACTION_TEMPLATE_DELETE_CONFIRMATION) &&
        hasParam("transactionTemplateId") && (
          <TransactionTemplateDeleteConfirmationModal
            transactionTemplateId={params.transactionTemplateId!}
          />
        )}
      {is(MODAL_ROUTES.BUDGET_DEACTIVATE_CONFIRMATION) &&
        hasParam("budgetId") && (
          <BudgetDeactivateConfirmationModal
            budgetId={params.budgetId!}
            budgetName={params.budgetName}
          />
        )}
    </Modal>
  );
};
