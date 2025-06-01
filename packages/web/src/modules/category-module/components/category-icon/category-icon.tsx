import { Tag } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '../../../../libs/utils';

import { CATEGORY_COLORS, CATEGORY_ICONS } from './constants';

interface CategoryIconProps {
  iconValue?: string;
  colorValue?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable CategoryIcon component that displays a category's custom icon with appropriate styling
 */
export const CategoryIcon = forwardRef<HTMLDivElement, CategoryIconProps>(
  ({ iconValue, colorValue, size = 'md', className }, ref) => {
    // Get the icon component or fallback to Tag
    const selectedIcon = CATEGORY_ICONS.find((icon) => icon.value === iconValue);
    const IconComponent = selectedIcon?.icon ?? Tag;

    // Get the color configuration or fallback to coral
    const selectedColor = CATEGORY_COLORS.find((color) => color.value === colorValue);
    const colorClasses = selectedColor?.color ?? 'bg-coral-500';

    // Size configurations
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };

    const iconSizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    };

    // Determine if this is an outline variant to set appropriate text color
    const isOutlineVariant = selectedColor?.value?.includes('-outline') ?? false;
    const iconTextColor = isOutlineVariant ? 'text-current' : 'text-white';

    return (
      <div
        ref={ref}
        className={cn('rounded-full flex items-center justify-center', sizeClasses[size], colorClasses, className)}
      >
        <IconComponent className={cn(iconSizeClasses[size], iconTextColor)} />
      </div>
    );
  }
);

CategoryIcon.displayName = 'CategoryIcon';
