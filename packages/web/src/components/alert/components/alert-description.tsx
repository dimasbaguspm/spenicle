import type React from 'react';

import { cn } from '../../../libs/utils';
import type { AlertDescriptionProps } from '../types';

// alert description subcomponent for displaying body text with proper formatting
export const AlertDescription: React.FC<AlertDescriptionProps> = ({ children, className }) => {
  return <div className={cn('text-sm leading-relaxed [&_p]:leading-relaxed', className)}>{children}</div>;
};
