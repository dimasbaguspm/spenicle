import { useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';
import { IconButton } from '../button/icon-button';

export interface BackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Override default back navigation behavior */
  onPress?: () => void;
  /** Show/hide the back button */
  visible?: boolean;
  /** Custom icon to use instead of ChevronLeft */
  icon?: React.ReactNode;
  /** Button variant */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'error' | 'error-outline' | 'error-ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
}

export const BackButton = forwardRef<HTMLButtonElement, BackButtonProps>(
  ({ className, onPress, visible = true, icon, variant = 'ghost', size = 'md', ...props }, ref) => {
    const router = useRouter();

    if (!visible) return null;

    const handlePress = () => {
      if (onPress) {
        onPress();
      } else {
        // Use router.history.back() for browser-like back navigation
        if (window.history.length > 1) {
          router.history.back();
        } else {
          // Fallback to navigate to root if no history
          void router.navigate({ to: '/' });
        }
      }
    };

    return (
      <IconButton
        ref={ref}
        variant={variant}
        size={size}
        className={cn('flex-shrink-0', className)}
        onClick={handlePress}
        {...props}
      >
        {icon ?? <ChevronLeft className="h-5 w-5" />}
      </IconButton>
    );
  }
);

BackButton.displayName = 'BackButton';
