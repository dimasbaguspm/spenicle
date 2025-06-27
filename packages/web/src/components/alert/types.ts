import { type VariantProps } from 'class-variance-authority';
import type React from 'react';

import { alertVariants } from './alert';

// main alert component props interface
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  onClose?: () => void;
}

// subcomponent props interfaces
export interface AlertTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export interface AlertContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface AlertIconProps {
  children: React.ReactNode;
  className?: string;
}

export interface AlertCloseButtonProps {
  className?: string;
  onClose?: () => void;
}

// context interface for internal component communication
export interface AlertContextType {
  onClose?: () => void;
  variant?: string | null;
}
