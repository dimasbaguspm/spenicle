import { cva } from 'class-variance-authority';
import type { ElementType, ButtonHTMLAttributes, ComponentPropsWithoutRef } from 'react';

import { cn } from '../../libs/utils';

import { BrandIcon } from './components/brand-icon';
import { BrandText } from './components/brand-text';
import { validateBrandProps, GAP_SIZE_CLASSES } from './helpers';
import type { BrandPolymorphicProps } from './types';

// brand style variants for size and color
const brandVariants = cva('flex items-center select-none', {
  variants: {
    size: GAP_SIZE_CLASSES,
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

export const Brand = <E extends ElementType = 'button'>(props: BrandPolymorphicProps<E>) => {
  const validatedProps = validateBrandProps(props);
  const { className, showTitle = true, as, children, ...rest } = props;

  const Tag = as ?? 'button';

  const classNames = cn(
    brandVariants({
      size: validatedProps.validatedSize,
      color: validatedProps.validatedColor,
      className,
    }),
    validatedProps.isInteractive ? 'cursor-pointer' : ''
  );

  const tagProps = {
    className: classNames,
    'aria-label': 'Spenicle brand logo and tagline',
    role: 'img',
    ...rest,
  } as ComponentPropsWithoutRef<E>;

  // ensure button elements have proper type attribute for accessibility
  if (Tag === 'button' && !('type' in tagProps)) {
    (tagProps as ButtonHTMLAttributes<HTMLButtonElement>).type = 'button';
  }

  return (
    <Tag {...tagProps}>
      <Brand.Icon size={validatedProps.validatedSize} />
      {(showTitle || children) && (
        <Brand.Text
          subtitle={validatedProps.sanitizedSubtitle}
          showTitle={showTitle}
          size={validatedProps.validatedSize}
        />
      )}
      {children}
    </Tag>
  );
};

// attach subcomponents to main component using compound pattern
Brand.Icon = BrandIcon;
Brand.Text = BrandText;

export { brandVariants };
