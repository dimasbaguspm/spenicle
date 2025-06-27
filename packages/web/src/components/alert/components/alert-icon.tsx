import React, { useContext } from 'react';

import { cn } from '../../../libs/utils';
import { getAlertIconColor } from '../helpers';
import type { AlertIconProps } from '../types';

import { AlertContext } from './alert-context';

// alert icon subcomponent with automatic color based on alert variant
export const AlertIcon: React.FC<AlertIconProps> = ({ children, className }) => {
  const context = useContext(AlertContext);

  // get icon color based on current alert variant
  const iconColor = getAlertIconColor(context?.variant);

  return <div className={cn('flex-shrink-0 mt-0.5', iconColor, className)}>{children}</div>;
};
