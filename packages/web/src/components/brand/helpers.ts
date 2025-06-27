import type { ElementType } from 'react';

import type { BrandSize, BrandColor, BrandPolymorphicProps } from './types';

// secure size validation to prevent injection and ensure design system compliance
const VALID_BRAND_SIZES: readonly BrandSize[] = ['sm', 'md', 'lg'] as const;
const VALID_BRAND_COLORS: readonly BrandColor[] = ['default', 'alt'] as const;

// icon size class mappings
export const ICON_SIZE_CLASSES: Record<BrandSize, string> = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-7 w-7',
} as const;

// radius size class mappings
export const RADIUS_SIZE_CLASSES: Record<BrandSize, string> = {
  sm: 'rounded-xl',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
} as const;

// gap size class mappings
export const GAP_SIZE_CLASSES: Record<BrandSize, string> = {
  sm: 'gap-2',
  md: 'gap-3',
  lg: 'gap-4',
} as const;

// title size class mappings
export const TITLE_SIZE_CLASSES: Record<BrandSize, string> = {
  sm: 'text-lg font-bold',
  md: 'text-xl font-bold',
  lg: 'text-2xl font-bold',
} as const;

// subtitle size class mappings
export const SUBTITLE_SIZE_CLASSES: Record<BrandSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} as const;

/**
 * validates brand size against allowed values
 * ensures type safety and prevents invalid styling
 */
export const isValidBrandSize = (size: unknown): size is BrandSize => {
  return typeof size === 'string' && VALID_BRAND_SIZES.includes(size as BrandSize);
};

/**
 * validates brand color against allowed values
 * ensures consistent color theming
 */
export const isValidBrandColor = (color: unknown): color is BrandColor => {
  return typeof color === 'string' && VALID_BRAND_COLORS.includes(color as BrandColor);
};

/**
 * sanitizes subtitle content to prevent xss
 * removes potentially dangerous characters
 */
export const sanitizeSubtitle = (subtitle: unknown): string => {
  if (typeof subtitle !== 'string') return '';

  // remove html tags and dangerous characters
  return subtitle.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
};

/**
 * determines if component should be interactive
 * checks for click handlers or interactive element types
 */
export const isInteractiveElement = <E extends ElementType>(
  elementType: E | undefined,
  hasClickHandler: boolean
): boolean => {
  return hasClickHandler || elementType === 'button' || elementType === 'a';
};

/**
 * gets icon size classes with fallback
 * ensures valid classes are always returned
 */
export const getIconSizeClasses = (size?: BrandSize): string => {
  if (!size || !isValidBrandSize(size)) {
    return ICON_SIZE_CLASSES.md;
  }
  return ICON_SIZE_CLASSES[size];
};

/**
 * gets radius size classes with fallback
 * ensures valid classes are always returned
 */
export const getRadiusSizeClasses = (size?: BrandSize): string => {
  if (!size || !isValidBrandSize(size)) {
    return RADIUS_SIZE_CLASSES.md;
  }
  return RADIUS_SIZE_CLASSES[size];
};

/**
 * gets title size classes with fallback
 * ensures valid classes are always returned
 */
export const getTitleSizeClasses = (size?: BrandSize): string => {
  if (!size || !isValidBrandSize(size)) {
    return TITLE_SIZE_CLASSES.md;
  }
  return TITLE_SIZE_CLASSES[size];
};

/**
 * gets subtitle size classes with fallback
 * ensures valid classes are always returned
 */
export const getSubtitleSizeClasses = (size?: BrandSize): string => {
  if (!size || !isValidBrandSize(size)) {
    return SUBTITLE_SIZE_CLASSES.md;
  }
  return SUBTITLE_SIZE_CLASSES[size];
};

/**
 * validates brand props for security and consistency
 * ensures all props meet security and design system requirements
 */
export const validateBrandProps = <E extends ElementType>(
  props: BrandPolymorphicProps<E>
): {
  isValid: boolean;
  validatedSize: BrandSize;
  validatedColor: BrandColor;
  sanitizedSubtitle: string;
  isInteractive: boolean;
} => {
  const validatedSize = isValidBrandSize(props.size) ? props.size : 'md';
  const validatedColor = isValidBrandColor(props.color) ? props.color : 'default';
  const sanitizedSubtitle = sanitizeSubtitle(props.subtitle);
  const isInteractive = isInteractiveElement(props.as, !!props.onClick);

  return {
    isValid: true,
    validatedSize,
    validatedColor,
    sanitizedSubtitle,
    isInteractive,
  };
};
