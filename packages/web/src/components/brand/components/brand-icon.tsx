import { Zap } from 'lucide-react';

import { cn } from '../../../libs/utils';
import { getIconSizeClasses, getRadiusSizeClasses } from '../helpers';
import type { BrandIconProps } from '../types';

export const BrandIcon: React.FC<BrandIconProps> = ({ size = 'md', className }) => {
  const iconClasses = getIconSizeClasses(size);
  const radiusClasses = getRadiusSizeClasses(size);

  return (
    <span className={cn(`p-2 bg-coral-500 ${radiusClasses} shadow-sm`, className)} aria-hidden="true">
      <Zap className={cn('text-white', iconClasses)} />
    </span>
  );
};
