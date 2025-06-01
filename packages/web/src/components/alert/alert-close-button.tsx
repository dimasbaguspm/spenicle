import { X } from 'lucide-react';
import { useContext } from 'react';

import { IconButton } from '../button';

import { AlertContext } from './alert-context';

export interface AlertCloseButtonProps {
  className?: string;
  onClose?: () => void;
}

export function AlertCloseButton({ className, onClose }: AlertCloseButtonProps) {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('AlertCloseButton must be used within an Alert');
  }

  const { onClose: contextOnClose } = context;
  const handleClose = onClose ?? contextOnClose;

  if (!handleClose) {
    return null;
  }

  return (
    <IconButton variant="ghost" size="sm" onClick={handleClose} className={className} aria-label="Close alert">
      <X className="h-4 w-4" />
    </IconButton>
  );
}
