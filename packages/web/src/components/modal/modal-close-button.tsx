import { X } from 'lucide-react';
import { useContext } from 'react';

import { IconButton } from '../button';

import { ModalContext } from './modal-context';

export interface ModalCloseButtonProps {
  className?: string;
  onClose?: () => void;
}

export function ModalCloseButton({ className, onClose }: ModalCloseButtonProps) {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('ModalCloseButton must be used within a Modal');
  }

  const { onClose: contextOnClose } = context;
  const handleClose = onClose ?? contextOnClose;

  return (
    <IconButton variant="ghost" onClick={handleClose} className={className}>
      <X className="h-5 w-5" />
    </IconButton>
  );
}
