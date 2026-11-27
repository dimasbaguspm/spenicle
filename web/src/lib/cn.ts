import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** cva hands back conflicting tailwind classes; twMerge keeps the last one that wins. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
