import { BadRequestException } from '../exceptions/index.ts';

/**
 * Parses a string ID into a number
 * @param id The string ID to parse
 * @param errorMessage Optional custom error message
 * @returns The parsed number ID
 * @throws BadRequestException if the ID is not a valid number
 */
export function parseId(id: unknown, errorMessage?: string): number {
  if (typeof id === 'undefined' || id === null || id === '') {
    throw new BadRequestException(errorMessage ?? 'ID is required');
  }

  if (!['number', 'string'].includes(typeof id)) {
    throw new BadRequestException(errorMessage ?? 'ID must be a number or string');
  }

  const parsedId = parseInt(id as string, 10);

  if (isNaN(parsedId)) {
    throw new BadRequestException(errorMessage ?? `Invalid ID. Must be a valid number.`);
  }

  return parsedId;
}

/**
 * Parses a string amount into a number
 * @param amount The string amount to parse
 * @param errorMessage Optional custom error message
 * @returns The parsed number amount
 * @throws BadRequestException if the amount is not a valid number
 */
export function parseAmount(amount: string, errorMessage?: string): number {
  if (!amount) {
    throw new BadRequestException(errorMessage ?? 'Amount is required');
  }

  const parsedAmount = parseFloat(amount);

  if (isNaN(parsedAmount)) {
    throw new BadRequestException(errorMessage ?? `Invalid amount: ${amount}. Must be a valid number.`);
  }

  return parsedAmount;
}

/**
 * Converts numeric strings to numbers in a query object, returning a new object
 * This is necessary because req.query has null prototype and is frozen
 * @param query - The query object to process
 * @returns A new object with converted numeric values
 */
export function parseQuery(query: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key in query) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const value = query[key];
      if (typeof value === 'string' && isNumericString(value)) {
        result[key] = parseFloat(value);
      } else if (Array.isArray(value)) {
        // Handle array values (e.g., multiple query params with same name)
        result[key] = value.map((item) =>
          typeof item === 'string' && isNumericString(item) ? parseFloat(item) : item
        );
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Recursively converts numeric strings to numbers in an object
 * @param obj - The object to process
 * @returns The processed object with numeric strings converted to numbers
 * @throws BadRequestException if the input is not a valid object
 */
export function parseBody(obj: unknown): object {
  if (obj === null || typeof obj !== 'object') {
    throw new BadRequestException('Invalid input: expected an object or array');
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      if (typeof item === 'string' && isNumericString(item)) {
        obj[i] = parseFloat(item);
      } else if (typeof item === 'object' && item !== null) {
        parseBody(item); // Recursively process nested objects/arrays
      }
    }
    return obj;
  }

  // Handle objects
  const objectRecord = obj as Record<string, unknown>;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(objectRecord, key)) {
      const value = objectRecord[key];

      if (typeof value === 'string' && isNumericString(value)) {
        // Convert to number if it's a valid numeric string
        objectRecord[key] = parseFloat(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        parseBody(value);
      }
    }
  }

  return objectRecord;
}

/**
 * Parses comma-separated IDs into an array of numbers
 * @param value The value to parse (can be string, array, or undefined)
 * @param fieldName Optional field name for error messages
 * @returns Array of parsed number IDs, or undefined if input is empty
 * @throws BadRequestException if any ID is not a valid number
 */
export function parseMultipleIds(value: unknown, fieldName = 'IDs'): number[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  let ids: string[] = [];

  if (typeof value === 'string') {
    // Handle comma-separated string: "1,2,3"
    ids = value
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '');
  } else if (Array.isArray(value)) {
    // Handle array of strings/numbers
    ids = value.map((item) => String(item).trim()).filter((id) => id !== '');
  } else if (typeof value === 'number') {
    // Handle single number value
    ids = [String(value).trim()];
  } else {
    throw new BadRequestException(`Invalid ${fieldName}: must be a string, number, or array`);
  }

  if (ids.length === 0) {
    return undefined;
  }

  const parsedIds: number[] = [];
  for (const id of ids) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId) || parsedId <= 0) {
      throw new BadRequestException(`Invalid ${fieldName}: "${id}" must be a positive integer`);
    }
    parsedIds.push(parsedId);
  }

  return parsedIds;
}

/**
 * parses a value into a string array or returns undefined
 *
 * - if value is undefined, null, or empty string, returns undefined
 * - if value is an array, trims and stringifies each item, filters out empty strings, returns array or undefined if empty
 * - if value is a string, trims and returns as single-element array or undefined if empty
 * - ignores objects and other types
 *
 * @param value value to normalize (string, array, or undefined)
 * @returns string[] if value exists, otherwise undefined
 */
export function parseStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (Array.isArray(value)) {
    // filter out non-strings and empty strings
    const arr = value.filter((v) => typeof v === 'string' && v.trim() !== '').map((v) => (v as string).trim());
    return arr.length > 0 ? arr : undefined;
  }
  if (typeof value === 'string') {
    const str = value.trim();
    return str !== '' ? [str] : undefined;
  }
  // ignore objects and other types
  return undefined;
}

/**
 * Checks if a string represents a valid number
 * @param str - The string to check
 * @returns true if the string represents a valid number
 */
function isNumericString(str: string): boolean {
  // Empty string is not numeric
  if (str.trim() === '') {
    return false;
  }

  // Check if it's a valid number (including decimals, negative numbers, Infinity, NaN)
  const num = Number(str);
  return !isNaN(num) || str.trim() === 'NaN' || str.trim() === 'Infinity' || str.trim() === '-Infinity';
}
