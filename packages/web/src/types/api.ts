/* eslint-disable */
/* tslint:disable */
/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY!
 * 
 * This file was automatically generated from the Swagger/OpenAPI specification.
 * Any manual changes will be overwritten when the types are regenerated.
 * 
 * To regenerate this file, run: npm run generate-types
 * 
 * Generated on: 2025-06-03T23:00:07.401Z
 * Source: http://localhost:3000/api/docs/swagger.json
 */

export interface Error {
  /**
   * HTTP status code
   * @example 400
   */
  status: number;
  /**
   * Error message
   * @example "Validation failed"
   */
  message: string;
  /**
   * Additional error details (optional)
   * @example {"field":"email","issue":"invalid format"}
   */
  details?: Record<string, any>;
}

export interface User {
  /** User unique identifier */
  id?: number;
  /** Group identifier the user belongs to */
  groupId?: number;
  /**
   * User email address
   * @format email
   * @maxLength 255
   */
  email?: string;
  /**
   * User full name
   * @maxLength 255
   */
  name?: string;
  /** Whether the user is active */
  isActive?: boolean;
  /** Whether the user has completed the onboarding process */
  isOnboard?: boolean;
  /**
   * User creation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  createdAt?: string;
  /**
   * User last update timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  updatedAt?: string;
}

export interface Group {
  /** Group unique identifier */
  id?: number;
  /**
   * Group name
   * @maxLength 255
   */
  name?: string;
  /**
   * Default currency code (3 characters)
   * @minLength 3
   * @maxLength 3
   * @example "USD"
   */
  defaultCurrency?: string;
  /**
   * Group creation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  createdAt?: string;
  /**
   * Group last update timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  updatedAt?: string;
}

export interface Account {
  /** Account unique identifier */
  id?: number;
  /** Group identifier the account belongs to */
  groupId?: number;
  /**
   * Account name
   * @maxLength 255
   */
  name?: string;
  /**
   * Account type (e.g., checking, savings, credit, cash)
   * @maxLength 50
   * @example "checking"
   */
  type?: string;
  /** Optional account notes */
  note?: string | null;
  /**
   * Optional metadata for storing custom account information as key-value pairs
   * @example {"bankCode":"ABC123","accountNumber":"1234567890","branch":"Main Branch"}
   */
  metadata?: Record<string, any>;
  /**
   * Account creation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  createdAt?: string;
  /**
   * Account last update timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  updatedAt?: string;
}

export interface Category {
  /** Category unique identifier */
  id?: number;
  /** Group identifier the category belongs to */
  groupId?: number;
  /** Parent category ID for nested categories */
  parentId?: number | null;
  /**
   * Category name
   * @maxLength 100
   */
  name?: string;
  /** Optional category notes */
  note?: string | null;
  /**
   * Optional metadata for storing custom category information as key-value pairs
   * @example {"categoryType":"expense","color":"#FF5733","icon":"shopping-cart"}
   */
  metadata?: Record<string, any>;
  /**
   * Category creation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  createdAt?: string;
  /**
   * Category last update timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  updatedAt?: string;
}

export interface Transaction {
  /** Transaction unique identifier */
  id?: number;
  /** Group identifier */
  groupId?: number;
  /** Account identifier */
  accountId?: number;
  /** Category identifier */
  categoryId?: number;
  /** User who created the transaction */
  createdByUserId?: number;
  /**
   * Transaction amount with 2 decimal precision
   * @multipleOf 0.01
   * @example 123.45
   */
  amount?: number;
  /**
   * Currency code (3 characters)
   * @minLength 3
   * @maxLength 3
   * @example "USD"
   */
  currency?: string;
  /**
   * Transaction type
   * @example "expense"
   */
  type?: "expense" | "income" | "transfer";
  /**
   * Transaction date with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  date?: string;
  /** Optional transaction notes */
  note?: string | null;
  /** Recurrence pattern ID if this is a recurring transaction */
  recurrenceId?: number | null;
  /**
   * Whether the transaction is marked as highlighted/important
   * @default false
   * @example false
   */
  isHighlighted?: boolean;
  /**
   * Transaction creation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  createdAt?: string;
  /**
   * Transaction last update timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  updatedAt?: string;
}

export interface AuthTokens {
  /** JWT access token */
  accessToken?: string;
  /** JWT refresh token */
  refreshToken?: string;
  /** Access token expiration time in seconds */
  expiresIn?: number;
}

export interface AccountLimit {
  /** Account limit unique identifier */
  id?: number;
  /** Account identifier */
  accountId?: number;
  /** Limit period */
  period?: "month" | "week";
  /**
   * Spending limit amount
   * @min 0
   * @multipleOf 0.01
   */
  limit?: number;
  /**
   * Account limit creation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  createdAt?: string;
  /**
   * Account limit last update timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  updatedAt?: string;
}

export interface Recurrence {
  /** Recurrence unique identifier */
  id?: number;
  /** Recurrence frequency */
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  /**
   * Interval between recurrences
   * @min 1
   */
  interval?: number;
  /**
   * Next occurrence date with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  nextOccurrenceDate?: string;
  /**
   * End date for recurrence with timezone support
   * @format date-time
   * @example "2023-12-31T23:59:59Z"
   */
  endDate?: string | null;
  /**
   * Recurrence creation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  createdAt?: string;
  /**
   * Recurrence last update timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  updatedAt?: string;
}

export interface RefreshToken {
  /** Refresh token unique identifier */
  id?: number;
  /** User identifier */
  userId?: number;
  /** Refresh token value */
  token?: string;
  /**
   * Token expiration timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  expires?: string;
  /**
   * Token creation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  createdAt?: string;
  /**
   * Token revocation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  revokedAt?: string | null;
  /** Token that replaced this one */
  replacedByToken?: string | null;
}

export interface PaginatedResponse {
  /** Array of items */
  items?: any[];
  /** Current page number */
  pageNumber?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Total number of items */
  totalItems?: number;
  /** Total number of pages */
  totalPages?: number;
}

export type PagedGroups = PaginatedResponse & {
  items?: Group[];
};

export type PagedUsers = PaginatedResponse & {
  items?: User[];
};

export type PagedAccounts = PaginatedResponse & {
  items?: Account[];
};

export type PagedAccountLimits = PaginatedResponse & {
  items?: AccountLimit[];
};

export type PagedCategories = PaginatedResponse & {
  items?: Category[];
};

export type PagedRecurrences = PaginatedResponse & {
  items?: Recurrence[];
};

export type PagedTransactions = PaginatedResponse & {
  items?: Transaction[];
};

export interface NewGroup {
  /**
   * Group name
   * @maxLength 255
   */
  name: string;
  /**
   * Default currency code (3 characters)
   * @minLength 3
   * @maxLength 3
   * @example "USD"
   */
  defaultCurrency: string;
}

export interface UpdateGroup {
  /**
   * Group name
   * @maxLength 255
   */
  name?: string;
  /**
   * Default currency code (3 characters)
   * @minLength 3
   * @maxLength 3
   * @example "USD"
   */
  defaultCurrency?: string;
}

export interface NewUser {
  /** Group identifier the user belongs to */
  groupId: number;
  /**
   * User email address
   * @format email
   * @maxLength 255
   */
  email: string;
  /**
   * User password hash
   * @maxLength 255
   */
  passwordHash: string;
  /**
   * User full name
   * @maxLength 255
   */
  name: string;
  /** Whether the user is active */
  isActive: boolean;
  /**
   * Whether the user has completed the onboarding process
   * @default false
   */
  isOnboard: boolean;
}

export interface UpdateUser {
  /** Group identifier the user belongs to */
  groupId?: number;
  /**
   * User email address
   * @format email
   * @maxLength 255
   */
  email?: string;
  /**
   * User password hash
   * @maxLength 255
   */
  passwordHash?: string;
  /**
   * User full name
   * @maxLength 255
   */
  name?: string;
  /** Whether the user is active */
  isActive?: boolean;
  /** Whether the user has completed the onboarding process */
  isOnboard?: boolean;
}

export interface UserRegistration {
  /**
   * User full name
   * @maxLength 255
   * @example "John Doe"
   */
  name: string;
  /**
   * User email address
   * @format email
   * @maxLength 255
   * @example "john.doe@example.com"
   */
  email: string;
  /**
   * User password (minimum 8 characters)
   * @minLength 8
   * @example "securePassword123"
   */
  password: string;
}

export interface GroupRegistration {
  /**
   * Group name
   * @maxLength 255
   * @example "Doe Family Budget"
   */
  name: string;
  /**
   * Default currency for the group (3-letter code)
   * @minLength 3
   * @maxLength 3
   * @example "USD"
   */
  defaultCurrency?: string | null;
}

export interface RegistrationRequest {
  user: UserRegistration;
  group: GroupRegistration;
}

export interface LoginRequest {
  /**
   * User email address
   * @format email
   * @example "john.doe@example.com"
   */
  email: string;
  /**
   * User password
   * @format password
   * @example "securePassword123"
   */
  password: string;
}

export interface NewAccount {
  /** Group identifier the account belongs to */
  groupId: number;
  /**
   * Account name
   * @maxLength 255
   */
  name: string;
  /**
   * Account type (e.g., checking, savings, credit, cash)
   * @maxLength 50
   * @example "checking"
   */
  type: string;
  /** Optional account notes */
  note?: string | null;
  /**
   * Optional metadata for storing custom account information as key-value pairs
   * @example {"bankCode":"ABC123","accountNumber":"1234567890","branch":"Main Branch"}
   */
  metadata?: Record<string, any>;
}

export interface UpdateAccount {
  /** Group identifier the account belongs to */
  groupId?: number;
  /**
   * Account name
   * @maxLength 255
   */
  name?: string;
  /**
   * Account type (e.g., checking, savings, credit, cash)
   * @maxLength 50
   * @example "checking"
   */
  type?: string;
  /** Optional account notes */
  note?: string | null;
  /**
   * Optional metadata for storing custom account information as key-value pairs
   * @example {"bankCode":"ABC123","accountNumber":"1234567890","branch":"Main Branch"}
   */
  metadata?: Record<string, any>;
}

export interface NewAccountLimit {
  /** Account identifier */
  accountId: number;
  /** Limit period */
  period: "month" | "week";
  /**
   * Spending limit amount
   * @min 0
   * @multipleOf 0.01
   */
  limit: number;
}

export interface UpdateAccountLimit {
  /** Account identifier */
  accountId?: number;
  /** Limit period */
  period?: "month" | "week";
  /**
   * Spending limit amount
   * @min 0
   * @multipleOf 0.01
   */
  limit?: number;
}

export interface NewCategory {
  /** Group identifier the category belongs to */
  groupId: number;
  /** Parent category ID for nested categories */
  parentId?: number | null;
  /**
   * Category name
   * @maxLength 100
   */
  name: string;
  /** Optional category notes */
  note?: string | null;
  /**
   * Optional metadata for storing custom category information as key-value pairs
   * @example {"categoryType":"expense","color":"#FF5733","icon":"shopping-cart"}
   */
  metadata?: Record<string, any>;
}

export interface UpdateCategory {
  /** Group identifier the category belongs to */
  groupId?: number;
  /** Parent category ID for nested categories */
  parentId?: number | null;
  /**
   * Category name
   * @maxLength 100
   */
  name?: string;
  /** Optional category notes */
  note?: string | null;
  /**
   * Optional metadata for storing custom category information as key-value pairs
   * @example {"categoryType":"expense","color":"#FF5733","icon":"shopping-cart"}
   */
  metadata?: Record<string, any>;
}

export interface NewRecurrence {
  /** Recurrence frequency */
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  /**
   * Interval between recurrences
   * @min 1
   */
  interval: number;
  /**
   * Next occurrence date with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  nextOccurrenceDate: string;
  /**
   * End date for recurrence with timezone support
   * @format date-time
   * @example "2023-12-31T23:59:59Z"
   */
  endDate?: string | null;
}

export interface UpdateRecurrence {
  /** Recurrence frequency */
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  /**
   * Interval between recurrences
   * @min 1
   */
  interval?: number;
  /**
   * Next occurrence date with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  nextOccurrenceDate?: string;
  /**
   * End date for recurrence with timezone support
   * @format date-time
   * @example "2023-12-31T23:59:59Z"
   */
  endDate?: string | null;
}

export interface NewTransaction {
  /** Group identifier */
  groupId: number;
  /** Account identifier */
  accountId: number;
  /** Category identifier */
  categoryId: number;
  /** User who created the transaction */
  createdByUserId: number;
  /**
   * Transaction amount with 2 decimal precision
   * @multipleOf 0.01
   * @example 123.45
   */
  amount: number;
  /**
   * Currency code (3 characters)
   * @minLength 3
   * @maxLength 3
   * @example "USD"
   */
  currency: string;
  /**
   * Transaction type
   * @example "expense"
   */
  type: "expense" | "income" | "transfer";
  /**
   * Transaction date with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  date: string;
  /** Optional transaction notes */
  note?: string | null;
  /** Recurrence pattern ID if this is a recurring transaction */
  recurrenceId?: number | null;
  /**
   * Whether the transaction is marked as highlighted/important
   * @default false
   * @example false
   */
  isHighlighted?: boolean;
}

export interface UpdateTransaction {
  /** Group identifier */
  groupId?: number;
  /** Account identifier */
  accountId?: number;
  /** Category identifier */
  categoryId?: number;
  /** User who created the transaction */
  createdByUserId?: number;
  /**
   * Transaction amount with 2 decimal precision
   * @multipleOf 0.01
   * @example 123.45
   */
  amount?: number;
  /**
   * Currency code (3 characters)
   * @minLength 3
   * @maxLength 3
   * @example "USD"
   */
  currency?: string;
  /**
   * Transaction type
   * @example "expense"
   */
  type?: "expense" | "income" | "transfer";
  /**
   * Transaction date with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  date?: string;
  /** Optional transaction notes */
  note?: string | null;
  /** Recurrence pattern ID if this is a recurring transaction */
  recurrenceId?: number | null;
  /**
   * Whether the transaction is marked as highlighted/important
   * @default false
   * @example false
   */
  isHighlighted?: boolean;
}

export interface NewRefreshToken {
  /** User identifier */
  userId: number;
  /** Refresh token value */
  token: string;
  /**
   * Token expiration timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  expires: string;
  /**
   * Token revocation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  revokedAt?: string | null;
  /** Token that replaced this one */
  replacedByToken?: string | null;
}

export interface UpdateRefreshToken {
  /** User identifier */
  userId?: number;
  /** Refresh token value */
  token?: string;
  /**
   * Token expiration timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  expires?: string;
  /**
   * Token revocation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  revokedAt?: string | null;
  /** Token that replaced this one */
  replacedByToken?: string | null;
}

export interface QueryParameters {
  /**
   * Page number for pagination
   * @min 1
   * @default 1
   */
  pageNumber?: number;
  /**
   * Number of items per page
   * @min 1
   * @max 100
   * @default 25
   */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: string;
  /**
   * Sort order
   * @default "asc"
   */
  sortOrder?: "asc" | "desc";
}

export type UserQueryParameters = QueryParameters & {
  /** Filter by user ID */
  id?: number;
  /** Filter by group ID */
  groupId?: number;
  /**
   * Filter by email
   * @format email
   */
  email?: string;
  /** Filter by name */
  name?: string;
  /** Filter by active status */
  isActive?: boolean;
  /** Filter by onboarding status */
  isOnboard?: boolean;
  /** Field to sort by */
  sortBy?: "name" | "email" | "createdAt";
};

export type GroupQueryParameters = QueryParameters & {
  /** Filter by group ID */
  id?: number;
  /** Filter by group name */
  name?: string;
  /** Field to sort by */
  sortBy?: "name" | "createdAt";
};

export type AccountQueryParameters = QueryParameters & {
  /** Filter by account ID */
  id?: number;
  /** Filter by group ID */
  groupId?: number;
  /** Filter by account name */
  name?: string;
  /** Filter by account type */
  type?: string;
  /** Field to sort by */
  sortBy?: "name" | "type" | "createdAt";
};

export type CategoryQueryParameters = QueryParameters & {
  /** Filter by category ID */
  id?: number;
  /** Filter by group ID */
  groupId?: number;
  /** Filter by parent category ID */
  parentId?: number | null;
  /** Filter by category name */
  name?: string;
  /** Field to sort by */
  sortBy?: "name" | "createdAt";
};

export type TransactionQueryParameters = QueryParameters & {
  /** Filter by transaction ID */
  id?: number;
  /** Filter by group ID */
  groupId?: number;
  /** Filter by account ID */
  accountId?: number;
  /** Filter by category ID */
  categoryId?: number;
  /** Filter by user who created the transaction */
  createdByUserId?: number;
  /** Search in transaction notes */
  note?: string;
  /**
   * Filter transactions from this date with timezone support
   * @format date-time
   * @example "2023-12-01T00:00:00Z"
   */
  startDate?: string;
  /**
   * Filter transactions until this date with timezone support
   * @format date-time
   * @example "2023-12-31T23:59:59Z"
   */
  endDate?: string;
  /**
   * Filter by currency code
   * @minLength 3
   * @maxLength 3
   */
  currency?: string;
  /** Filter by recurrence ID */
  recurrenceId?: number;
  /** Field to sort by */
  sortBy?: "date" | "amount" | "createdAt";
  /**
   * Filter by highlighted status
   * @example true
   */
  isHighlighted?: boolean;
};

export type AccountLimitQueryParameters = QueryParameters & {
  /** Filter by account limit ID */
  id?: number;
  /** Filter by account ID */
  accountId?: number;
  /** Filter by period */
  period?: "month" | "week";
  /** Field to sort by */
  sortBy?: "period" | "limit" | "startDate" | "createdAt";
};

export type RecurrenceQueryParameters = QueryParameters & {
  /** Filter by recurrence ID */
  id?: number;
  /** Filter by frequency */
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  /**
   * Filter recurrences starting from this date with timezone support
   * @format date-time
   * @example "2023-12-01T00:00:00Z"
   */
  startDate?: string;
  /**
   * Filter recurrences ending before this date with timezone support
   * @format date-time
   * @example "2023-12-31T23:59:59Z"
   */
  endDate?: string;
  /** Field to sort by */
  sortBy?: "frequency" | "interval" | "nextOccurrenceDate" | "createdAt";
};

export type RefreshTokenQueryParameters = QueryParameters & {
  /** Filter by user ID */
  userId?: number;
  /** Filter by token value */
  token?: string;
  /** Filter by active status (not revoked) */
  isActive?: boolean;
  /** Field to sort by */
  sortBy?: "userId" | "expires" | "createdAt";
};

export interface UserPreference {
  /** User preference unique identifier */
  id?: number;
  /** User identifier this preference belongs to */
  userId?: number;
  /**
   * Day of month when monthly periods start (1-31)
   * @min 1
   * @max 31
   * @example 25
   */
  monthlyStartDate?: number;
  /**
   * Day of week when weekly periods start (0=Sunday, 1=Monday, ..., 6=Saturday)
   * @min 0
   * @max 6
   * @example 1
   */
  weeklyStartDay?: number;
  /**
   * Period for spending limits calculation
   * @example "monthly"
   */
  limitPeriod?: "weekly" | "monthly" | "annually";
  /**
   * Period for category spending calculation
   * @example "monthly"
   */
  categoryPeriod?: "weekly" | "monthly" | "annually";
  /**
   * Preference creation timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  createdAt?: string;
  /**
   * Preference last update timestamp with timezone support
   * @format date-time
   * @example "2023-12-01T10:30:00Z"
   */
  updatedAt?: string;
}

export interface CreateUserPreference {
  /** User identifier this preference belongs to */
  userId: number;
  /**
   * Day of month when monthly periods start (1-31)
   * @min 1
   * @max 31
   * @default 25
   * @example 25
   */
  monthlyStartDate?: number;
  /**
   * Day of week when weekly periods start (0=Sunday, 1=Monday, ..., 6=Saturday)
   * @min 0
   * @max 6
   * @default 1
   * @example 1
   */
  weeklyStartDay?: number;
  /**
   * Period for spending limits calculation
   * @default "monthly"
   * @example "monthly"
   */
  limitPeriod?: "weekly" | "monthly" | "annually";
  /**
   * Period for category spending calculation
   * @default "monthly"
   * @example "monthly"
   */
  categoryPeriod?: "weekly" | "monthly" | "annually";
}

export interface UpdateUserPreference {
  /**
   * Day of month when monthly periods start (1-31)
   * @min 1
   * @max 31
   * @example 25
   */
  monthlyStartDate?: number;
  /**
   * Day of week when weekly periods start (0=Sunday, 1=Monday, ..., 6=Saturday)
   * @min 0
   * @max 6
   * @example 1
   */
  weeklyStartDay?: number;
  /**
   * Period for spending limits calculation
   * @example "monthly"
   */
  limitPeriod?: "weekly" | "monthly" | "annually";
  /**
   * Period for category spending calculation
   * @example "monthly"
   */
  categoryPeriod?: "weekly" | "monthly" | "annually";
}

export type UserPreferenceQueryParameters = QueryParameters & {
  /** Filter by preference ID */
  id?: number;
  /** Filter by user ID */
  userId?: number;
  /**
   * Filter by monthly start date
   * @min 1
   * @max 31
   */
  monthlyStartDate?: number;
  /**
   * Filter by weekly start day
   * @min 0
   * @max 6
   */
  weeklyStartDay?: number;
  /** Filter by limit period */
  limitPeriod?: "weekly" | "monthly" | "annually";
  /** Filter by category period */
  categoryPeriod?: "weekly" | "monthly" | "annually";
  /** Field to sort by */
  sortBy?: "userId" | "monthlyStartDate" | "createdAt";
};

export type SummaryPeriodQueryParameters = QueryParameters & {
  /**
   * Start date (ISO 8601)
   * @format date-time
   */
  startDate?: string;
  /**
   * End date (ISO 8601)
   * @format date-time
   */
  endDate?: string;
  /** Filter by account ID */
  accountId?: string;
  /** Filter by category ID */
  categoryId?: string;
  /** Sort by field */
  sortBy?: "totalIncome" | "totalExpenses" | "totalNet" | "netAmount";
  /** Sort order */
  sortOrder?: "asc" | "desc";
};

export type SummaryCategoriesPeriod = {
  /** @example 1 */
  categoryId?: number;
  /**
   * @format date-time
   * @example "2024-01-01T00:00:00Z"
   */
  startDate?: string;
  /**
   * @format date-time
   * @example "2024-01-31T23:59:59Z"
   */
  endDate?: string;
  /** @example 5000 */
  totalIncome?: number;
  /** @example 3500 */
  totalExpenses?: number;
  /** @example 1500 */
  totalNet?: number;
  /** @example 42 */
  totalTransactions?: number;
}[];

export type SummaryAccountsPeriod = {
  /** @example 2 */
  accountId?: number;
  /**
   * @format date-time
   * @example "2024-01-01T00:00:00Z"
   */
  startDate?: string;
  /**
   * @format date-time
   * @example "2024-01-31T23:59:59Z"
   */
  endDate?: string;
  /** @example 8000 */
  totalIncome?: number;
  /** @example 2000 */
  totalExpenses?: number;
  /** @example 6000 */
  totalNet?: number;
  /** @example 30 */
  totalTransactions?: number;
}[];

export type SummaryTransactionsPeriod = {
  /**
   * @format date-time
   * @example "2024-01-01T00:00:00Z"
   */
  startDate?: string;
  /**
   * @format date-time
   * @example "2024-01-07T23:59:59Z"
   */
  endDate?: string;
  /** @example 2000 */
  totalIncome?: number;
  /** @example 1200 */
  totalExpenses?: number;
  /** @example 800 */
  netAmount?: number;
}[];
