import { pgTable, serial, varchar, timestamp, text, boolean, integer, decimal, json } from 'drizzle-orm/pg-core';

import { PaginatedResponse } from '../types/index.ts';

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  defaultCurrency: varchar('default_currency', { length: 3 }).notNull(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  isActive: boolean('is_active').notNull(),
  isOnboard: boolean('is_onboard').notNull(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // debit, credit, etc.
  note: text('note'),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
});

export const accountLimits = pgTable('account_limits', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  period: varchar('period', { length: 20 }).notNull(), // 'month' or 'week'
  limit: decimal('limit', { precision: 14, scale: 2 }).$type<number>().notNull(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'string', withTimezone: true }).$type<string>().notNull(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { mode: 'string', withTimezone: true }).$type<string>(),
  replacedByToken: text('replaced_by_token'),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id'), // nullable, for nested categories
  name: varchar('name', { length: 100 }).notNull(),
  note: text('note'),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
});

export const recurrences = pgTable('recurrences', {
  id: serial('id').primaryKey(),
  frequency: varchar('frequency', { length: 20 }).notNull(), // daily, weekly, monthly, yearly
  interval: integer('interval').notNull(),
  nextOccurrenceDate: timestamp('next_occurrence_date', { mode: 'string', withTimezone: true })
    .$type<string>()
    .notNull(),
  endDate: timestamp('end_date', { mode: 'string', withTimezone: true }).$type<string>(),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id')
    .notNull()
    .references(() => groups.id, { onDelete: 'cascade' }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'restrict' }),
  categoryId: integer('category_id')
    .notNull()
    .references(() => categories.id),
  createdByUserId: integer('created_by_user_id')
    .notNull()
    .references(() => users.id),
  amount: decimal('amount', { precision: 14, scale: 2 }).$type<number>().notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  type: varchar('type', { length: 8 }).notNull(), // 'expense', 'income', 'transfer'
  date: timestamp('date', { mode: 'string', withTimezone: true }).$type<string>().notNull(), // date of the transaction
  note: text('note'),
  isHighlighted: boolean('is_highlighted').default(false).notNull(),
  recurrenceId: integer('recurrence_id')
    .$type<number>()
    .references(() => recurrences.id),
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  monthlyStartDate: integer('monthly_start_date').notNull(), // Day of month (1-31)
  weeklyStartDay: integer('weekly_start_day').notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  limitPeriod: varchar('limit_period', { length: 20 }).notNull(), // 'weekly', 'monthly', 'annually'
  categoryPeriod: varchar('category_period', { length: 20 }).notNull(), // 'weekly', 'monthly', 'annually'
  createdAt: timestamp('created_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string', withTimezone: true }).$type<string>().defaultNow().notNull(),
});

// Define types
export type Group = typeof groups.$inferSelect;
export type PagedGroups = PaginatedResponse<Group>;
export type NewGroup = typeof groups.$inferInsert;
export type UpdateGroup = Partial<NewGroup>;

export type User = typeof users.$inferSelect;
export type PagedUsers = PaginatedResponse<User>;
export type NewUser = typeof users.$inferInsert;
export type UpdateUser = Partial<NewUser>;

export type Account = typeof accounts.$inferSelect;
export type PagedAccounts = PaginatedResponse<Account>;
export type NewAccount = typeof accounts.$inferInsert;
export type UpdateAccount = Partial<NewAccount>;

export type AccountLimit = typeof accountLimits.$inferSelect;
export type PagedAccountLimits = PaginatedResponse<AccountLimit>;
export type NewAccountLimit = typeof accountLimits.$inferInsert;
export type UpdateAccountLimit = Partial<NewAccountLimit>;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type UpdateRefreshToken = Partial<NewRefreshToken>;

export type Category = typeof categories.$inferSelect;
export type PagedCategories = PaginatedResponse<Category>;
export type NewCategory = typeof categories.$inferInsert;
export type UpdateCategory = Partial<NewCategory>;

export type Recurrence = typeof recurrences.$inferSelect;
export type PagedRecurrences = PaginatedResponse<Recurrence>;
export type NewRecurrence = typeof recurrences.$inferInsert;
export type UpdateRecurrence = Partial<NewRecurrence>;

export type Transaction = typeof transactions.$inferSelect;
export type PagedTransactions = PaginatedResponse<Transaction>;
export type NewTransaction = typeof transactions.$inferInsert;
export type UpdateTransaction = Partial<NewTransaction>;

export type UserPreference = typeof userPreferences.$inferSelect;
export type PagedUserPreferences = PaginatedResponse<UserPreference>;
export type NewUserPreference = typeof userPreferences.$inferInsert;
export type UpdateUserPreference = Partial<NewUserPreference>;
