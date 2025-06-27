import type React from 'react';

// badge component props
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children?: React.ReactNode;
}

// badge icon subcomponent props
export interface BadgeIconProps extends React.SVGAttributes<SVGElement> {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  size?: BadgeSize;
  position?: 'left' | 'right';
}

// badge content subcomponent props
export interface BadgeContentProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  truncate?: boolean;
  maxLength?: number;
}

// badge variant types aligned with design system
export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'ghost'
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
  | 'danger-ghost'
  | 'error'
  | 'error-outline'
  | 'error-ghost';

// badge size variants for consistent typing
export type BadgeSize = 'sm' | 'md' | 'lg' | 'xl';

// semantic badge types for easier categorization
export type BadgeSemanticType = 'neutral' | 'success' | 'info' | 'warning' | 'danger';

// badge style variants for validation
export type BadgeStyleVariant = 'solid' | 'outline' | 'ghost';
