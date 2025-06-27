import { cn } from '../../../libs/utils';
import { getTitleSizeClasses, getSubtitleSizeClasses, sanitizeSubtitle } from '../helpers';
import type { BrandTextProps } from '../types';

export const BrandText: React.FC<BrandTextProps> = ({
  title = 'Spenicle',
  subtitle = 'Simplify Spending, Maximize Savings',
  showTitle = true,
  size = 'md',
  className,
}) => {
  const titleClasses = getTitleSizeClasses(size);
  const subtitleClasses = getSubtitleSizeClasses(size);

  // sanitize subtitle for security if it's a string
  const sanitizedSubtitle = typeof subtitle === 'string' ? sanitizeSubtitle(subtitle) : subtitle;

  if (!showTitle) {
    return null;
  }

  return (
    <span className={cn(className)}>
      <span className={cn(titleClasses, 'text-slate-900 leading-tight')}>{title}</span>
      {subtitle && (
        <span className={cn('block text-slate-600 leading-snug', subtitleClasses)}>{sanitizedSubtitle}</span>
      )}
    </span>
  );
};
