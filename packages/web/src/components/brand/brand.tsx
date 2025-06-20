import { cva, type VariantProps } from 'class-variance-authority';
import { Zap } from 'lucide-react';
import type { FC, ReactNode } from 'react';

// brand style variants for size and color
const brandVariants = cva('flex items-center gap-3 select-none', {
  variants: {
    size: {
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
    },
    color: {
      default: '',
      alt: '', // reserved for future alt color schemes
    },
  },
  defaultVariants: {
    size: 'md',
    color: 'default',
  },
});

export interface BrandProps extends VariantProps<typeof brandVariants> {
  subtitle?: ReactNode;
  className?: string;
  showTitle?: boolean;
}

export const Brand: FC<BrandProps> = ({
  size,
  color,
  subtitle = 'Simplify Spending, Maximize Savings',
  className,
  showTitle = true,
}) => {
  const iconClassMap = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
  };
  const radiusClassMap = {
    sm: 'rounded-xl',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
  };
  const iconClass = iconClassMap[size ?? 'md'];
  const radiusClass = radiusClassMap[size ?? 'md'];

  return (
    <div className={brandVariants({ size, color, className })} aria-label="Spenicle brand logo and tagline" role="img">
      <span className={`p-2 bg-coral-500 ${radiusClass} shadow-sm`} aria-hidden>
        <Zap className={'text-white ' + iconClass} />
      </span>
      {showTitle && (
        <span>
          <span className="text-xl font-bold text-slate-900 leading-tight">Spenicle</span>
          {subtitle && <span className="block text-sm text-slate-600 leading-snug">{subtitle}</span>}
        </span>
      )}
    </div>
  );
};

export { brandVariants };
