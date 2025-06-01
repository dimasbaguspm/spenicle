import { Modal as BaseModal } from './modal';
import { ModalCloseButton } from './modal-close-button';
import { ModalContent } from './modal-content';
import { ModalDescription } from './modal-description';
import { ModalFooter } from './modal-footer';
import { ModalHeader } from './modal-header';
import { ModalTitle } from './modal-title';

type ModalCompositionModel = {
  Header: typeof ModalHeader;
  Title: typeof ModalTitle;
  Description: typeof ModalDescription;
  Content: typeof ModalContent;
  Footer: typeof ModalFooter;
  CloseButton: typeof ModalCloseButton;
};

const ModalComposition = {
  Header: ModalHeader,
  Title: ModalTitle,
  Description: ModalDescription,
  Content: ModalContent,
  Footer: ModalFooter,
  CloseButton: ModalCloseButton,
} satisfies ModalCompositionModel;

export const Modal = Object.assign(BaseModal, ModalComposition);

export type { ModalProps } from './modal';
