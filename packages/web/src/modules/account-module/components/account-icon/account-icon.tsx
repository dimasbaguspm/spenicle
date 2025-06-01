import { CreditCard } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '../../../../libs/utils';

import { ACCOUNT_COLORS, ACCOUNT_ICONS } from './constants';

interface AccountIconProps {
  iconValue?: string;
  colorValue?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Reusable AccountIcon component that displays an account's custom icon with appropriate styling
 */
export const AccountIcon = forwardRef<HTMLDivElement, AccountIconProps>(
  ({ iconValue, colorValue, size = 'md', className }, ref) => {
    // Get the icon component or fallback to CreditCard
    const selectedIcon = ACCOUNT_ICONS.find((icon) => icon.value === iconValue);
    const IconComponent = selectedIcon?.icon ?? CreditCard;

    // Get the color configuration or fallback to coral
    const selectedColor = ACCOUNT_COLORS.find((color) => color.value === colorValue);
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
        className={cn('rounded-lg flex items-center justify-center', sizeClasses[size], colorClasses, className)}
      >
        <IconComponent className={cn(iconSizeClasses[size], iconTextColor)} />
      </div>
    );
  }
);

AccountIcon.displayName = 'AccountIcon';
