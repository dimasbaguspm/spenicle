import type React from 'react';

import { cn } from '../../../libs/utils';
import type { AlertTitleProps } from '../types';

// alert title subcomponent for displaying heading text
export const AlertTitle: React.FC<AlertTitleProps> = ({ children, className }) => {
  return <h3 className={cn('text-sm font-semibold leading-none tracking-tight', className)}>{children}</h3>;
};
