import { createContext, useContext, useState, type FC, type PropsWithChildren } from 'react';

import { Modal } from '../../components';

interface ModalContextType {
  openModal: (modalId: string) => void;
  closeModal: () => void;
  Modal: typeof Modal;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within a ModalProvider');
  return context;
}

export const ModalProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = (_: string) => {
    setIsOpen(true);
  };

  const closeModal = () => setIsOpen(false);

  const contextValue = {
    openModal,
    closeModal,
    Modal,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      {isOpen && (
        <Modal onClose={closeModal} size="md" closeOnOverlayClick closeOnEscape>
          <Modal.Header>
            <Modal.Title>Modal Title</Modal.Title>
            <Modal.CloseButton />
          </Modal.Header>
          <Modal.Content>
            <p>Modal content goes here</p>
          </Modal.Content>
          <Modal.Footer>
            <button onClick={closeModal} className="btn btn-secondary">
              Close
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </ModalContext.Provider>
  );
};

// Export types
export type { ModalContextType };
