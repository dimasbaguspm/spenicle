import type { BadgeVariant, BadgeSemanticType, BadgeStyleVariant, BadgeSize } from './types';

// secure badge variant validation to prevent injection and ensure design system compliance
const VALID_BADGE_VARIANTS: readonly BadgeVariant[] = [
  'default',
  'secondary',
  'tertiary',
  'outline',
  'ghost',
  'coral',
  'coral-outline',
  'coral-ghost',
  'sage',
  'sage-outline',
  'sage-ghost',
  'mist',
  'mist-outline',
  'mist-ghost',
  'slate',
  'slate-outline',
  'slate-ghost',
  'success',
  'success-outline',
  'success-ghost',
  'info',
  'info-outline',
  'info-ghost',
  'warning',
  'warning-outline',
  'warning-ghost',
  'danger',
  'danger-outline',
  'danger-ghost',
  'error',
  'error-outline',
  'error-ghost',
] as const;

const VALID_BADGE_SIZES: readonly BadgeSize[] = ['sm', 'md', 'lg', 'xl'] as const;

/**
 * validates badge variant against allowed values
 * ensures type safety and prevents invalid styling
 */
export const isValidBadgeVariant = (variant: unknown): variant is BadgeVariant => {
  return typeof variant === 'string' && VALID_BADGE_VARIANTS.includes(variant as BadgeVariant);
};

/**
 * validates badge size against allowed values
 * ensures consistent sizing across component library
 */
export const isValidBadgeSize = (size: unknown): size is BadgeSize => {
  return typeof size === 'string' && VALID_BADGE_SIZES.includes(size as BadgeSize);
};

/**
 * sanitizes badge content to prevent xss attacks
 * removes potentially dangerous html and script content
 */
export const sanitizeBadgeContent = (content: unknown): string => {
  if (typeof content !== 'string') {
    if (content === null || content === undefined) {
      return '';
    }
    if (typeof content === 'number' || typeof content === 'boolean') {
      return String(content);
    }
    // for objects, arrays, etc., return empty string to prevent object stringification
    return '';
  }

  // remove script tags and javascript: urls
  const sanitized = content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();

  return sanitized;
};

/**
 * truncates text content to prevent layout issues
 * ensures consistent badge sizing and readability
 */
export const truncateText = (text: string, maxLength: number = 20): string => {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
};

/**
 * determines semantic type from badge variant
 * useful for accessibility and screen reader context
 */
export const getSemanticType = (variant?: BadgeVariant): BadgeSemanticType => {
  if (!variant) return 'neutral';

  if (variant.includes('success')) return 'success';
  if (variant.includes('info')) return 'info';
  if (variant.includes('warning')) return 'warning';
  if (variant.includes('danger') || variant.includes('error')) return 'danger';

  return 'neutral';
};

/**
 * determines style variant from badge variant
 * extracts the visual style (solid, outline, ghost) from compound variants
 */
export const getStyleVariant = (variant?: BadgeVariant): BadgeStyleVariant => {
  if (!variant) return 'solid';

  if (variant.includes('outline')) return 'outline';
  if (variant.includes('ghost')) return 'ghost';

  return 'solid';
};

/**
 * gets accessible label for badge based on semantic type
 * provides screen reader context for badge purpose
 */
export const getAccessibleLabel = (semanticType: BadgeSemanticType, content?: string): string => {
  const contentText = content ? `: ${content}` : '';

  switch (semanticType) {
    case 'success':
      return `Success badge${contentText}`;
    case 'info':
      return `Information badge${contentText}`;
    case 'warning':
      return `Warning badge${contentText}`;
    case 'danger':
      return `Error badge${contentText}`;
    default:
      return `Badge${contentText}`;
  }
};

/**
 * validates badge props for security and consistency
 * ensures all props meet security and design system requirements
 */
export const validateBadgeProps = (props: {
  variant?: BadgeVariant;
  size?: BadgeSize;
  content?: unknown;
}): {
  isValid: boolean;
  sanitizedContent: string;
  validatedVariant: BadgeVariant;
  validatedSize: BadgeSize;
} => {
  const validatedVariant = isValidBadgeVariant(props.variant) ? props.variant : 'default';
  const validatedSize = isValidBadgeSize(props.size) ? props.size : 'md';
  const sanitizedContent = sanitizeBadgeContent(props.content);

  return {
    isValid: true,
    sanitizedContent,
    validatedVariant,
    validatedSize,
  };
};
