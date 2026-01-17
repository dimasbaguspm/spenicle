import { words, deburr, head, last } from "lodash";

/**
 * Convert a full name into initials.
 * Examples:
 *   'Dimas Bagus P' -> 'DP'
 *   'john doe' -> 'JD'
 *   'Madonna' -> 'MA' (first two letters)
 *
 * @param name - Full name string
 * @param maxSingleWord - How many characters to use for a single-word name (default 2)
 * @returns Uppercase initials
 */
export function nameToInitials(name: string, maxSingleWord = 2): string {
  if (!name) return "";
  const cleaned = deburr(String(name)).trim();
  if (cleaned.length === 0) return "";

  const cleanedWords = words(cleaned);
  if (cleanedWords.length === 0) return "";

  if (cleanedWords.length === 1) {
    const w = cleanedWords[0];
    if (!w) return "";
    return w.slice(0, Math.min(maxSingleWord, w.length)).toUpperCase();
  }

  const firstWord = head(cleanedWords) ?? "";
  const lastWord = last(cleanedWords) ?? "";
  return (firstWord.charAt(0) + lastWord.charAt(0)).toUpperCase();
}
