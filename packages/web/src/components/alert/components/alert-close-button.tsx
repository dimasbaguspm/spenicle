import { X } from 'lucide-react';
import React, { useContext } from 'react';

import { IconButton } from '../../button';
import type { AlertCloseButtonProps } from '../types';

import { AlertContext } from './alert-context';

// alert close button subcomponent with automatic close functionality
export const AlertCloseButton: React.FC<AlertCloseButtonProps> = ({ className, onClose }) => {
  const context = useContext(AlertContext);

  if (!context) {
    throw new Error('AlertCloseButton must be used within an Alert');
  }

  const { onClose: contextOnClose } = context;
  const handleClose = onClose ?? contextOnClose;

  // don't render if no close handler is available
  if (!handleClose) {
    return null;
  }

  return (
    <IconButton variant="ghost" size="sm" onClick={handleClose} className={className} aria-label="Close alert">
      <X className="h-4 w-4" />
    </IconButton>
  );
};
