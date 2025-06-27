import type React from 'react';

import { cn } from '../../../libs/utils';
import type { AlertContentProps } from '../types';

// alert content wrapper subcomponent for organizing title and description
export const AlertContent: React.FC<AlertContentProps> = ({ children, className }) => {
  return <div className={cn('flex-1 space-y-1', className)}>{children}</div>;
};
