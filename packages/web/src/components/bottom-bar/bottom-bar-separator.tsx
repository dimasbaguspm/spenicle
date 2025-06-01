import { cn } from '../../libs/utils';

export interface BottomBarSeparatorProps {
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  variant?: 'light' | 'normal' | 'strong';
}

const variantClasses = {
  light: 'border-mist-100',
  normal: 'border-mist-200',
  strong: 'border-mist-300',
} as const;

export function BottomBarSeparator({
  className,
  orientation = 'vertical',
  variant = 'normal',
}: BottomBarSeparatorProps) {
  return (
    <div
      className={cn(
        'border-solid',
        orientation === 'vertical' ? 'border-l h-6 mx-2' : 'border-t w-full my-2',
        variantClasses[variant],
        className
      )}
    />
  );
}
