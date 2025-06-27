import type { ReactNode, ElementType, ComponentPropsWithoutRef, PropsWithChildren } from 'react';

// brand size variants
export type BrandSize = 'sm' | 'md' | 'lg';

// brand color variants
export type BrandColor = 'default' | 'alt';

// brand variant props from cva
export interface BrandVariantProps {
  size?: BrandSize;
  color?: BrandColor;
}

// base brand props
export interface BrandOwnProps {
  subtitle?: ReactNode;
  className?: string;
  showTitle?: boolean;
}

// polymorphic brand props
export type BrandPolymorphicProps<E extends ElementType = 'button'> = PropsWithChildren<
  BrandOwnProps & BrandVariantProps
> &
  Omit<ComponentPropsWithoutRef<E>, keyof BrandOwnProps | keyof BrandVariantProps> & {
    as?: E;
  };

// brand props interface
export interface BrandProps extends BrandOwnProps, BrandVariantProps {
  children?: ReactNode;
}

// brand icon subcomponent props
export interface BrandIconProps {
  size?: BrandSize;
  className?: string;
}

// brand text subcomponent props
export interface BrandTextProps {
  title?: string;
  subtitle?: ReactNode;
  showTitle?: boolean;
  size?: BrandSize;
  className?: string;
}
