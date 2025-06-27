import type React from 'react';

// main bottom bar component props
export interface BottomBarProps {
  children: React.ReactNode;
  className?: string;
  variant?: BottomBarVariant;
  hideOnScroll?: boolean;
  backdrop?: boolean;
  autoHide?: number; // auto-hide after x seconds
  onVisibilityChange?: (visible: boolean) => void;
}

// bottom bar context interface
export interface BottomBarContextType {
  isVisible?: boolean;
  onToggle?: () => void;
  onHide?: () => void;
  onShow?: () => void;
}

// bottom bar content subcomponent props
export interface BottomBarContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
}

// bottom bar action subcomponent props
export interface BottomBarActionProps {
  children: React.ReactNode;
  className?: string;
  variant?: BottomBarActionVariant;
  onClick?: () => void;
  disabled?: boolean;
}

// bottom bar group subcomponent props
export interface BottomBarGroupProps {
  children: React.ReactNode;
  className?: string;
  spacing?: BottomBarSpacing;
}

// badge variant types
export type BadgeVariant = 'coral' | 'sage' | 'danger' | 'warning' | 'info' | 'success';

// icon button variant types
export type IconButtonVariant =
  | 'coral'
  | 'coral-outline'
  | 'coral-ghost'
  | 'sage'
  | 'sage-outline'
  | 'sage-ghost'
  | 'mist'
  | 'mist-outline'
  | 'mist-ghost'
  | 'slate'
  | 'slate-outline'
  | 'slate-ghost'
  | 'success'
  | 'success-outline'
  | 'success-ghost'
  | 'info'
  | 'info-outline'
  | 'info-ghost'
  | 'warning'
  | 'warning-outline'
  | 'warning-ghost'
  | 'danger'
  | 'danger-outline'
  | 'danger-ghost';

// icon button size types
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// separator variant types (simplified)
export type SeparatorVariant = 'light' | 'normal' | 'strong';

// bottom bar icon button subcomponent props
export interface BottomBarIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  badge?: string | number;
  badgeVariant?: BadgeVariant;
  tooltip?: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  rounded?: boolean;
  withBadge?: boolean;
}

// bottom bar separator subcomponent props
export interface BottomBarSeparatorProps {
  className?: string;
  orientation?: 'vertical' | 'horizontal';
  variant?: SeparatorVariant;
}

// bottom bar variant types
export type BottomBarVariant = 'default' | 'floating' | 'compact';

// action variant types
export type BottomBarActionVariant = 'default' | 'primary' | 'secondary';

// icon variant types
export type BottomBarIconVariant = 'default' | 'primary' | 'ghost';

// icon size types
export type BottomBarIconSize = 'sm' | 'md' | 'lg';

// spacing types
export type BottomBarSpacing = 'none' | 'sm' | 'md' | 'lg';

// separator variant types
export type BottomBarSeparatorVariant = 'default' | 'subtle' | 'strong';

// variant configuration type for better type safety
export interface BottomBarVariantConfig {
  container: string;
  content: string;
  padding: string;
}
