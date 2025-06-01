import React from 'react';

import { cn } from '../../libs/utils';

export interface AlertDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertDescription({ children, className }: AlertDescriptionProps) {
  return <div className={cn('text-sm leading-relaxed [&_p]:leading-relaxed', className)}>{children}</div>;
}
