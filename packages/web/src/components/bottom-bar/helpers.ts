import type {
  BottomBarVariant,
  BottomBarVariantConfig,
  BottomBarActionVariant,
  BottomBarIconVariant,
  BottomBarSeparatorVariant,
  BottomBarSpacing,
  BottomBarIconButtonProps,
  BottomBarSeparatorProps,
  BadgeVariant,
  SeparatorVariant,
} from './types';

// secure variant validation to prevent injection and ensure design system compliance
const VALID_BOTTOM_BAR_VARIANTS: readonly BottomBarVariant[] = ['default', 'floating', 'compact'] as const;
const VALID_ACTION_VARIANTS: readonly BottomBarActionVariant[] = ['default', 'primary', 'secondary'] as const;
const VALID_ICON_VARIANTS: readonly BottomBarIconVariant[] = ['default', 'primary', 'ghost'] as const;
const VALID_SEPARATOR_VARIANTS: readonly BottomBarSeparatorVariant[] = ['default', 'subtle', 'strong'] as const;

// variant configurations for different bottom bar styles
export const BOTTOM_BAR_VARIANT_CONFIGS: Record<BottomBarVariant, BottomBarVariantConfig> = {
  default: {
    container: 'bottom-0 left-0 right-0',
    content: 'w-full bg-cream-50/95 backdrop-blur-md border-t border-mist-200/80 shadow-sm',
    padding: 'px-4 py-3',
  },
  floating: {
    container: 'bottom-4 left-4 right-4',
    content: 'w-full bg-cream-50/90 backdrop-blur-lg border border-mist-200/70 rounded-2xl shadow-md',
    padding: 'px-6 py-4',
  },
  compact: {
    container: 'bottom-0 left-0 right-0',
    content: 'w-full bg-white backdrop-blur-sm border-t border-mist-200/70 shadow-sm',
    padding: 'px-2 py-1.5',
  },
} as const;

// action variant class mappings
export const ACTION_VARIANT_CLASSES: Record<BottomBarActionVariant, string> = {
  default: 'flex items-center justify-center',
  primary: 'flex items-center justify-center bg-coral-500/10 rounded-xl px-3 py-2',
  secondary: 'flex items-center justify-center bg-sage-500/10 rounded-xl px-3 py-2',
} as const;

// icon variant class mappings
export const ICON_VARIANT_CLASSES: Record<BottomBarIconVariant, string> = {
  default: 'text-slate-600 hover:text-slate-800',
  primary: 'text-coral-600 hover:text-coral-700',
  ghost: 'text-slate-400 hover:text-slate-600',
} as const;

// separator variant class mappings
export const SEPARATOR_VARIANT_CLASSES: Record<BottomBarSeparatorVariant, string> = {
  default: 'bg-mist-200',
  subtle: 'bg-mist-100',
  strong: 'bg-mist-300',
} as const;

// spacing class mappings
export const SPACING_CLASSES: Record<BottomBarSpacing, string> = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
} as const;

/**
 * validates bottom bar variant against allowed values
 * ensures type safety and prevents invalid styling
 */
export const isValidBottomBarVariant = (variant: unknown): variant is BottomBarVariant => {
  return typeof variant === 'string' && VALID_BOTTOM_BAR_VARIANTS.includes(variant as BottomBarVariant);
};

/**
 * validates action variant against allowed values
 * ensures consistent styling across actions
 */
export const isValidActionVariant = (variant: unknown): variant is BottomBarActionVariant => {
  return typeof variant === 'string' && VALID_ACTION_VARIANTS.includes(variant as BottomBarActionVariant);
};

/**
 * validates icon variant against allowed values
 * ensures consistent icon styling
 */
export const isValidIconVariant = (variant: unknown): variant is BottomBarIconVariant => {
  return typeof variant === 'string' && VALID_ICON_VARIANTS.includes(variant as BottomBarIconVariant);
};

/**
 * validates separator variant against allowed values
 * ensures consistent separator styling
 */
export const isValidSeparatorVariant = (variant: unknown): variant is BottomBarSeparatorVariant => {
  return typeof variant === 'string' && VALID_SEPARATOR_VARIANTS.includes(variant as BottomBarSeparatorVariant);
};

/**
 * sanitizes auto hide duration to prevent performance issues
 * ensures reasonable timeout values
 */
export const sanitizeAutoHideDuration = (duration: unknown): number | undefined => {
  if (typeof duration !== 'number') return undefined;

  // limit duration between 1 second and 5 minutes for usability
  if (duration < 1 || duration > 300) return undefined;

  return duration;
};

/**
 * gets variant configuration with fallback
 * ensures valid configuration is always returned
 */
export const getVariantConfig = (variant?: BottomBarVariant): BottomBarVariantConfig => {
  if (!variant || !isValidBottomBarVariant(variant)) {
    return BOTTOM_BAR_VARIANT_CONFIGS.default;
  }
  return BOTTOM_BAR_VARIANT_CONFIGS[variant];
};

/**
 * gets action variant classes with fallback
 * ensures valid classes are always returned
 */
export const getActionVariantClasses = (variant?: BottomBarActionVariant): string => {
  if (!variant || !isValidActionVariant(variant)) {
    return ACTION_VARIANT_CLASSES.default;
  }
  return ACTION_VARIANT_CLASSES[variant];
};

/**
 * gets icon variant classes with fallback
 * ensures valid classes are always returned
 */
export const getIconVariantClasses = (variant?: BottomBarIconVariant): string => {
  if (!variant || !isValidIconVariant(variant)) {
    return ICON_VARIANT_CLASSES.default;
  }
  return ICON_VARIANT_CLASSES[variant];
};

/**
 * gets separator variant classes with fallback
 * ensures valid classes are always returned
 */
export const getSeparatorVariantClasses = (variant?: BottomBarSeparatorVariant): string => {
  if (!variant || !isValidSeparatorVariant(variant)) {
    return SEPARATOR_VARIANT_CLASSES.default;
  }
  return SEPARATOR_VARIANT_CLASSES[variant];
};

/**
 * validates bottom bar props for security and consistency
 * ensures all props meet security and design system requirements
 */
export const validateBottomBarProps = (props: {
  variant?: BottomBarVariant;
  autoHide?: number;
}): {
  isValid: boolean;
  validatedVariant: BottomBarVariant;
  validatedAutoHide?: number;
} => {
  const validatedVariant = isValidBottomBarVariant(props.variant) ? props.variant : 'default';
  const validatedAutoHide = sanitizeAutoHideDuration(props.autoHide);

  return {
    isValid: true,
    validatedVariant,
    validatedAutoHide,
  };
};

/**
 * handles scroll direction detection for hide on scroll functionality
 * provides smooth hiding behavior based on scroll direction
 */
export const detectScrollDirection = (currentScrollY: number, lastScrollY: number): 'up' | 'down' | 'none' => {
  const threshold = 5; // minimum scroll distance to register as movement

  if (Math.abs(currentScrollY - lastScrollY) < threshold) {
    return 'none';
  }

  return currentScrollY > lastScrollY ? 'down' : 'up';
};

/**
 * validates icon button props for security and accessibility
 * ensures proper prop structure and sanitizes values
 */
export const validateIconButtonProps = (props: BottomBarIconButtonProps): BottomBarIconButtonProps => {
  const sanitizedProps = { ...props };

  // sanitize badge value to prevent xss
  if (sanitizedProps.badge && typeof sanitizedProps.badge === 'string') {
    sanitizedProps.badge = sanitizedProps.badge.replace(/[<>]/g, '');
  }

  // validate badge variant
  const validBadgeVariants: readonly BadgeVariant[] = ['coral', 'sage', 'danger', 'warning', 'info', 'success'];
  if (sanitizedProps.badgeVariant && !validBadgeVariants.includes(sanitizedProps.badgeVariant)) {
    sanitizedProps.badgeVariant = 'coral';
  }

  // sanitize tooltip to prevent xss
  if (sanitizedProps.tooltip && typeof sanitizedProps.tooltip === 'string') {
    sanitizedProps.tooltip = sanitizedProps.tooltip.replace(/[<>]/g, '');
  }

  return sanitizedProps;
};

/**
 * gets badge classes based on variant
 * ensures consistent badge styling
 */
export const getBadgeClasses = (variant: string): string => {
  const badgeClasses = {
    coral: 'bg-coral-500 text-white',
    sage: 'bg-sage-500 text-white',
    danger: 'bg-danger-500 text-white',
    warning: 'bg-warning-500 text-white',
    info: 'bg-info-500 text-white',
    success: 'bg-success-500 text-white',
  } as const;

  return badgeClasses[variant as keyof typeof badgeClasses] || badgeClasses.coral;
};

/**
 * validates separator props for security and consistency
 * ensures proper orientation and variant values
 */
export const validateSeparatorProps = (props: BottomBarSeparatorProps): BottomBarSeparatorProps => {
  const sanitizedProps = { ...props };

  // validate orientation
  const validOrientations = ['vertical', 'horizontal'] as const;
  if (!sanitizedProps.orientation || !validOrientations.includes(sanitizedProps.orientation)) {
    sanitizedProps.orientation = 'vertical';
  }

  // validate variant
  const validVariants: readonly SeparatorVariant[] = ['light', 'normal', 'strong'];
  if (!sanitizedProps.variant || !validVariants.includes(sanitizedProps.variant)) {
    sanitizedProps.variant = 'normal';
  }

  return sanitizedProps;
};
