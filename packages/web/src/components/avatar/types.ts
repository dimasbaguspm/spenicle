import type React from 'react';

// avatar size variants for consistent typing
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

// avatar color variants aligned with design system
export type AvatarColor = 'coral' | 'sage' | 'mist' | 'slate' | 'cream';

// base avatar component props
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  loading?: 'eager' | 'lazy';
  color?: AvatarColor;
  size?: AvatarSize;
}

// avatar image subcomponent props
export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  loading?: 'eager' | 'lazy';
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

// avatar fallback subcomponent props
export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  color?: AvatarColor;
  size?: AvatarSize;
}

// color mapping types for type safety
export interface AvatarColorMaps {
  background: Record<AvatarColor, string>;
  text: Record<AvatarColor, string>;
}
