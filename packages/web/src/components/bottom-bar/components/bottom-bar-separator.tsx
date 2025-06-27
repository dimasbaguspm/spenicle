import { cn } from '../../../libs/utils';
import { validateSeparatorProps } from '../helpers';
import type { BottomBarSeparatorProps } from '../types';

const variantClasses = {
  light: 'border-mist-100',
  normal: 'border-mist-200',
  strong: 'border-mist-300',
} as const;

export const BottomBarSeparator: React.FC<BottomBarSeparatorProps> = (props) => {
  const validatedProps = validateSeparatorProps(props);
  const { className, orientation = 'vertical', variant = 'normal' } = validatedProps;

  return (
    <div
      className={cn(
        'border-solid',
        orientation === 'vertical' ? 'border-l h-6 mx-2' : 'border-t w-full my-2',
        variantClasses[variant],
        className
      )}
      role="separator"
      aria-orientation={orientation}
    />
  );
};
