import { X } from 'lucide-react';
import { useContext } from 'react';

import { IconButton } from '../button';

import { DrawerContext } from './drawer-context';

export interface DrawerCloseButtonProps {
  className?: string;
  onClose?: () => void;
}

export function DrawerCloseButton({ className, onClose }: DrawerCloseButtonProps) {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('DrawerCloseButton must be used within a Drawer');
  }

  const { onClose: contextOnClose } = context;
  const handleClose = onClose ?? contextOnClose;

  return (
    <IconButton variant="ghost" onClick={handleClose} className={className}>
      <X className="h-5 w-5" />
    </IconButton>
  );
}
