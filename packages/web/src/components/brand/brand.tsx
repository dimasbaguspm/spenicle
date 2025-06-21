import { cva, type VariantProps } from 'class-variance-authority';
import { Zap } from 'lucide-react';
import type { ReactNode, ElementType, ButtonHTMLAttributes, ComponentPropsWithoutRef, PropsWithChildren } from 'react';

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

type BrandOwnProps = {
  subtitle?: ReactNode;
  className?: string;
  showTitle?: boolean;
};

type PolymorphicProps<E extends ElementType> = PropsWithChildren<BrandOwnProps & VariantProps<typeof brandVariants>> &
  Omit<ComponentPropsWithoutRef<E>, keyof BrandOwnProps | 'size' | 'color'> & {
    as?: E;
  };

export const Brand = <E extends ElementType = 'button'>(props: PolymorphicProps<E>) => {
  const {
    size,
    color,
    subtitle = 'Simplify Spending, Maximize Savings',
    className,
    showTitle = true,
    as,
    ...rest
  } = props;
  const Tag = as ?? 'button';

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

  // determine if interactive for cursor-pointer
  const isInteractive = !!rest.onClick || Tag === 'button' || Tag === 'a';
  const classNames = [brandVariants({ size, color, className }), isInteractive ? 'cursor-pointer' : '']
    .filter(Boolean)
    .join(' ');

  const tagProps = {
    className: classNames,
    'aria-label': 'Spenicle brand logo and tagline',
    role: 'img',
    ...rest,
  } as ComponentPropsWithoutRef<E>;

  if (Tag === 'button' && !('type' in tagProps)) {
    (tagProps as ButtonHTMLAttributes<HTMLButtonElement>).type = 'button';
  }

  return (
    <Tag {...tagProps}>
      <span className={`p-2 bg-coral-500 ${radiusClass} shadow-sm`} aria-hidden>
        <Zap className={'text-white ' + iconClass} />
      </span>
      {showTitle && (
        <span>
          <span className="text-xl font-bold text-slate-900 leading-tight">Spenicle</span>
          {subtitle && <span className="block text-sm text-slate-600 leading-snug">{subtitle}</span>}
        </span>
      )}
    </Tag>
  );
};

export { brandVariants };
