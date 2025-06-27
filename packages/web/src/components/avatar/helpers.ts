import type { AvatarColor, AvatarColorMaps } from './types';

// secure color mapping to prevent injection and ensure design system compliance
export const AVATAR_COLOR_MAPS: AvatarColorMaps = {
  background: {
    coral: 'bg-coral-100',
    sage: 'bg-sage-100',
    mist: 'bg-mist-100',
    slate: 'bg-slate-100',
    cream: 'bg-cream-100',
  },
  text: {
    coral: 'text-coral-700', // strong contrast for coral bg
    sage: 'text-sage-700',
    mist: 'text-mist-700',
    slate: 'text-slate-700',
    cream: 'text-slate-700', // slate text for cream bg for best contrast
  },
} as const;

/**
 * generates initials from a name string with security validation
 * prevents xss and ensures consistent output format
 */
export const generateInitials = (name?: string): string => {
  if (!name || typeof name !== 'string') {
    return '?';
  }

  // sanitize input to prevent xss attacks
  const sanitizedName = name.replace(/[<>'"&]/g, '').trim();

  if (sanitizedName.length === 0) {
    return '?';
  }

  return sanitizedName
    .split(' ')
    .filter((word) => word.length > 0) // filter out empty strings
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2); // limit to 2 characters for consistency
};

/**
 * validates avatar color against allowed values
 * ensures type safety and prevents invalid styling
 */
export const isValidAvatarColor = (color: unknown): color is AvatarColor => {
  return typeof color === 'string' && ['coral', 'sage', 'mist', 'slate', 'cream'].includes(color);
};

/**
 * gets background class for avatar color with fallback
 * ensures design system compliance and prevents style injection
 */
export const getAvatarBackgroundClass = (color?: AvatarColor): string => {
  if (!color || !isValidAvatarColor(color)) {
    return AVATAR_COLOR_MAPS.background.coral; // safe default
  }
  return AVATAR_COLOR_MAPS.background[color];
};

/**
 * gets text class for avatar color with fallback
 * ensures design system compliance and accessibility
 */
export const getAvatarTextClass = (color?: AvatarColor): string => {
  if (!color || !isValidAvatarColor(color)) {
    return AVATAR_COLOR_MAPS.text.coral; // safe default
  }
  return AVATAR_COLOR_MAPS.text[color];
};

/**
 * validates image url for security
 * prevents potential ssrf and validates format
 */
export const isValidImageUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // basic url validation to prevent obvious injection attempts
  const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
  // check for potential javascript: or data: url attacks
  if (
    url.toLowerCase().startsWith('javascript:') ||
    url.toLowerCase().startsWith('data:') ||
    url.includes('<') ||
    url.includes('>')
  ) {
    return false;
  }

  return urlPattern.test(url);
};
