import crypto from 'crypto';

/**
 * Condition entry for prepared statement key generation
 */
export interface ConditionEntry {
  key: string;
  value: unknown;
}

/**
 * Options for prepared statement key generation
 */
interface PrepareStatementKeyOptions {
  prefix?: string;
  conditions?: ConditionEntry[];
  sortBy?: string;
  sortOrder?: string;
  pageNumber?: number;
  pageSize?: number;
}

/**
 * Generates a deterministic prepared statement key based on query conditions
 *
 * Takes conditions and query parameters, creates a deterministic string,
 * then hashes it to a 32-character string for use as a prepared statement key
 *
 * @param options - Configuration object with conditions and query parameters
 * @returns 32-character hash string for prepared statement key
 */
export function generatePrepareStatementKey(options: PrepareStatementKeyOptions): string {
  const { prefix = 'QUERY', conditions = [], sortBy, sortOrder, pageNumber, pageSize } = options;

  // create deterministic string from conditions and parameters
  const parts: string[] = [prefix];

  // add conditions in sorted order for deterministic results
  const sortedConditions = conditions
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ key, value }) => `${key}:${serializeValue(value)}`);

  if (sortedConditions.length > 0) {
    parts.push(`conditions:[${sortedConditions.join(',')}]`);
  }

  // add sorting parameters
  if (sortBy) parts.push(`sortBy:${sortBy}`);
  if (sortOrder) parts.push(`sortOrder:${sortOrder}`);

  // add pagination parameters
  if (pageNumber !== undefined) parts.push(`page:${pageNumber}`);
  if (pageSize !== undefined) parts.push(`size:${pageSize}`);

  // create final string and hash to 32 characters
  const combinedString = parts.join('|');

  return crypto.createHash('md5').update(combinedString).digest('hex');
}

/**
 * Serializes a value to a consistent string representation
 * Handles arrays, objects, dates, and primitive types
 *
 * @param value - Value to serialize
 * @returns String representation of the value
 */
function serializeValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (Array.isArray(value)) {
    return `[${value.map(serializeValue).join(',')}]`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${serializeValue(v)}`);
    return `{${entries.join(',')}}`;
  }

  return typeof value === 'string' ? value : JSON.stringify(value);
}

/**
 * Helper to create a condition entry for prepared statement key generation
 *
 * @param key - The condition key
 * @param value - The condition value
 * @returns Condition entry object
 */
export function createConditionEntry(key: string, value: unknown): ConditionEntry {
  return { key, value };
}
