import { ButtonIcon } from '@dimasbaguspm/versaur';
import { useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { forwardRef } from 'react';

export interface BackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Override default back navigation behavior */
  onPress?: () => void;
}

export const BackButton = forwardRef<HTMLButtonElement, BackButtonProps>(({ onPress, ...props }, ref) => {
  const router = useRouter();

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
    <ButtonIcon
      as={ChevronLeft}
      ref={ref}
      variant="ghost"
      size="lg"
      onClick={handlePress}
      aria-label="Go Back"
      {...props}
    />
  );
});
