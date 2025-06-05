import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number using compact notation (e.g., 1.2K, 3.4M) with Intl.NumberFormat
 * @param value The number to format
 * @param options Intl.NumberFormatOptions (optional)
 * @returns The formatted string
 */
export const formatNumberCompact = (value: number, options?: Intl.NumberFormatOptions): string => {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
    ...options,
  }).format(value);
};
