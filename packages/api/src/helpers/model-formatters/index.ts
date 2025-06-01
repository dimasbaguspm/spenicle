/**
 * Utility functions for formatting model fields
 */

import {
  Account,
  AccountLimit,
  Category,
  Group,
  Recurrence,
  RefreshToken,
  Transaction,
  User,
  UserPreference,
} from '../../models/schema.ts';

interface FieldFormatterConfig {
  timestampFields?: string[];
}

function formatModelFields<T extends Record<string, string | object | number | null | boolean>>(
  item: T,
  config: FieldFormatterConfig = {}
): T {
  if (!item || typeof item !== 'object') {
    return item;
  }

  const { timestampFields = [] } = config;

  const formatted = { ...item };

  for (const field of timestampFields) {
    if (field in formatted && formatted[field] != null) {
      try {
        const value = formatted[field];
        if (typeof value === 'string' || value instanceof Date) {
          Object.defineProperty(formatted, field, {
            value: new Date(value).toISOString(),
          });
        }
      } catch (error) {
        // If conversion fails, leave the original value
        console.warn(`Failed to format timestamp field '${field}':`, error);
      }
    }
  }

  return formatted;
}

export function formatAccountModel(item: Account): Account {
  return formatModelFields(item, {
    timestampFields: ['createdAt', 'updatedAt'],
  });
}

export function formatAccountLimitModel(item: AccountLimit): AccountLimit {
  return formatModelFields(item, {
    timestampFields: ['createdAt', 'updatedAt'],
  });
}

export function formatTransactionModel(item: Transaction): Transaction {
  return formatModelFields(item, {
    timestampFields: ['createdAt', 'updatedAt', 'date'],
  });
}

export function formatUserModel(item: User): User {
  return formatModelFields(item, {
    timestampFields: ['createdAt', 'updatedAt'],
  });
}

export function formatGroupModel(item: Group): Group {
  return formatModelFields(item, {
    timestampFields: ['createdAt', 'updatedAt'],
  });
}

export function formatCategoryModel(item: Category): Category {
  return formatModelFields(item, {
    timestampFields: ['createdAt', 'updatedAt'],
  });
}

export function formatRecurrenceModel(item: Recurrence): Recurrence {
  return formatModelFields(item, {
    timestampFields: ['createdAt', 'updatedAt', 'nextOccurrenceDate', 'endDate'],
  });
}

export function formatRefreshTokenModel(item: RefreshToken): RefreshToken {
  return formatModelFields(item, {
    timestampFields: ['createdAt', 'expires', 'revokedAt'],
  });
}

export function formatUserPreferenceModel(item: UserPreference): UserPreference {
  return formatModelFields(item, {
    timestampFields: ['createdAt', 'updatedAt'],
  });
}
