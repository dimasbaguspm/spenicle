/* eslint-disable no-console */
// filepath: /home/leshia/development/spenicle/packages/api/src/scripts/seed-dev.ts
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

import { db, pool } from '../core/db/config.ts';
import {
  users,
  groups,
  accounts,
  categories,
  transactions,
  accountLimits,
  userPreferences,
  recurrences,
  type NewGroup,
  type NewUser,
  type NewAccount,
  type NewCategory,
  type NewTransaction,
  type NewAccountLimit,
  type NewUserPreference,
  type NewRecurrence,
} from '../models/schema.ts';

// enhanced type definitions using satisfies - indonesian focused
type TransactionType = 'expense' | 'income' | 'transfer';
type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR'; // indonesian-focused currencies
type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
type LimitPeriod = 'week' | 'month';
type PreferencePeriod = 'weekly' | 'monthly' | 'annually';

// seeding configuration with enhanced type safety
const SEED_CONFIG = {
  groups: 3,
  usersPerGroup: 5,
  accountsPerGroup: 8,
  categoriesPerGroup: 15,
  transactionsPerAccount: 50,
  accountLimitsPerAccount: 0.7, // 70% chance of having limits
  recurrences: 10,
  batchSize: 1000, // for bulk operations
  defaultPassword: 'password123',
  bcryptRounds: 12,
} as const satisfies Record<string, number | string>;

// realistic data generation configurations - indonesian context
const AMOUNT_RANGES = {
  expense: { min: 10_000, max: 2_500_000, fractionDigits: 0 }, // rp 10k - 2.5m
  income: { min: 500_000, max: 25_000_000, fractionDigits: 0 }, // rp 500k - 25m
  transfer: { min: 100_000, max: 10_000_000, fractionDigits: 0 }, // rp 100k - 10m
} as const satisfies Record<TransactionType, { min: number; max: number; fractionDigits: number }>;

const CURRENCIES = ['IDR', 'USD', 'EUR', 'SGD', 'MYR'] as const satisfies readonly Currency[];

const ACCOUNT_TYPES = ['checking', 'savings', 'credit', 'investment', 'cash'] as const satisfies readonly AccountType[];

// indonesian expense categories
const EXPENSE_CATEGORIES = [
  'belanja harian', // daily shopping
  'transportasi',
  'hiburan',
  'listrik & air', // utilities
  'kesehatan',
  'pakaian',
  'pendidikan',
  'makan di luar',
  'langganan digital', // digital subscriptions
  'perawatan rumah',
  'asuransi',
  'perawatan diri',
  'olahraga',
  'teknologi',
  'liburan',
  'bensin', // fuel
  'pulsa & internet',
  'ojek online', // ride-hailing
  'warung makan', // local food stalls
  'kopi', // coffee
] as const satisfies readonly string[];

// indonesian income categories
const INCOME_CATEGORIES = [
  'gaji pokok', // base salary
  'freelance',
  'investasi',
  'bonus',
  'usaha sampingan', // side business
  'sewa properti',
  'hadiah',
  'dividen',
  'royalti',
  'komisi',
  'tunjangan', // allowance
  'bisnis online',
] as const satisfies readonly string[];

const RECURRENCE_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const satisfies readonly RecurrenceFrequency[];

const LIMIT_PERIODS = ['week', 'month'] as const satisfies readonly LimitPeriod[];

const PREFERENCE_PERIODS = ['weekly', 'monthly', 'annually'] as const satisfies readonly PreferencePeriod[];

// indonesian-specific data generators
const INDONESIAN_BANK_NAMES = [
  'Bank Mandiri',
  'Bank BCA',
  'Bank BRI',
  'Bank BNI',
  'Bank CIMB Niaga',
  'Bank Danamon',
  'Bank Permata',
  'Bank BTN',
  'Bank Mega',
  'Jenius',
  'Digibank',
  'Allo Bank',
] as const;

const INDONESIAN_CITIES = [
  'Jakarta',
  'Surabaya',
  'Bandung',
  'Bekasi',
  'Medan',
  'Depok',
  'Tangerang',
  'Palembang',
  'Semarang',
  'Makassar',
  'Batam',
  'Bogor',
  'Pekanbaru',
  'Bandar Lampung',
  'Yogyakarta',
] as const;

// indonesian transaction notes
const INDONESIAN_TRANSACTION_NOTES = {
  expense: [
    'Belanja di Indomaret',
    'Makan siang di warteg',
    'Naik ojek online ke kantor',
    'Beli kopi di cafe',
    'Bayar listrik bulanan',
    'Isi bensin motor',
    'Beli pulsa 50rb',
    'Belanja sayur di pasar',
    'Nonton bioskop',
    'Potong rambut',
    'Beli obat di apotek',
    'Service motor',
  ],
  income: [
    'Gaji bulan ini',
    'Bonus kinerja',
    'Hasil jualan online',
    'Freelance design logo',
    'Dividen saham',
    'Sewa kos-kosan',
    'Komisi penjualan',
    'THR lebaran',
    'Uang lembur',
    'Hasil investasi',
  ],
  transfer: [
    'Transfer ke tabungan',
    'Kirim uang ke orang tua',
    'Transfer antar bank',
    'Top up e-wallet',
    'Transfer ke dana darurat',
    'Bayar tagihan kartu kredit',
  ],
} as const;

// enhanced utility functions with better type safety
const generateRealisticAmount = (type: TransactionType): number => {
  const range = AMOUNT_RANGES[type];
  return faker.number.float(range);
};

const generateDateInRange = (options: { daysBack?: number } = {}): string => {
  const { daysBack = 90 } = options;
  const date = faker.date.recent({ days: daysBack });
  return date.toISOString();
};

// type-safe data generators with indonesian locale
const generateUserData = (groupId: number) => ({
  generateUser: async (): Promise<NewUser> => {
    // generate indonesian names
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const passwordHash = await bcrypt.hash(SEED_CONFIG.defaultPassword, SEED_CONFIG.bcryptRounds);

    return {
      groupId,
      email,
      passwordHash,
      name: `${firstName} ${lastName}`,
      isActive: faker.datatype.boolean(0.9), // 90% active users
      isOnboard: faker.datatype.boolean(0.8), // 80% onboarded users
    } satisfies NewUser;
  },
});

const generateAccountData = (groupId: number) => ({
  generateAccount: (): NewAccount => {
    const accountType = faker.helpers.arrayElement(ACCOUNT_TYPES);
    const bankName = faker.helpers.arrayElement(INDONESIAN_BANK_NAMES);
    const city = faker.helpers.arrayElement(INDONESIAN_CITIES);

    return {
      groupId,
      name: `${accountType} - ${bankName} ${city}`,
      type: accountType,
      note: faker.datatype.boolean(0.3) ? `Rekening di ${bankName} cabang ${city}` : null,
      metadata: faker.datatype.boolean(0.2) ? { institution: bankName, city } : null,
    } satisfies NewAccount;
  },
});

const generateCategoryData = (groupId: number) => ({
  generateExpenseCategory: (name: string): NewCategory =>
    ({
      groupId,
      parentId: null,
      name,
      note: faker.datatype.boolean(0.3) ? `Kategori untuk ${name} sehari-hari` : null,
      metadata: { type: 'expense' },
    }) satisfies NewCategory,

  generateIncomeCategory: (name: string): NewCategory =>
    ({
      groupId,
      parentId: null,
      name,
      note: faker.datatype.boolean(0.3) ? `Sumber pendapatan dari ${name}` : null,
      metadata: { type: 'income' },
    }) satisfies NewCategory,

  generateParentCategory: (name: string): NewCategory =>
    ({
      groupId,
      parentId: null,
      name,
      note: `Kategori utama untuk ${name}`,
      metadata: { type: 'parent' },
    }) satisfies NewCategory,
});

const generateTransactionData = (params: {
  groupId: number;
  accountId: number;
  categoryId: number;
  userId: number;
  recurrenceId?: number;
}) => ({
  generateTransaction: (): NewTransaction => {
    const transactionType = faker.helpers.arrayElement(['expense', 'income', 'transfer'] as const);
    const amount = generateRealisticAmount(transactionType);
    // primarily use IDR, with occasional other currencies
    const currency = faker.datatype.boolean(0.85) ? 'IDR' : faker.helpers.arrayElement(CURRENCIES);

    // get appropriate indonesian note for transaction type
    const noteOptions = INDONESIAN_TRANSACTION_NOTES[transactionType];
    const indonesianNote = faker.datatype.boolean(0.6) ? faker.helpers.arrayElement(noteOptions) : null;

    return {
      groupId: params.groupId,
      accountId: params.accountId,
      categoryId: params.categoryId,
      createdByUserId: params.userId,
      amount,
      currency,
      type: transactionType,
      date: generateDateInRange({ daysBack: 90 }),
      note: indonesianNote,
      isHighlighted: faker.datatype.boolean(0.1),
      recurrenceId: params.recurrenceId ?? null,
    } satisfies NewTransaction;
  },
});

const generateRecurrenceData = () => ({
  generateRecurrence: (): NewRecurrence => {
    const frequency = faker.helpers.arrayElement(RECURRENCE_FREQUENCIES);
    const interval = faker.number.int({ min: 1, max: 3 });
    const nextOccurrenceDate = faker.date.future().toISOString();
    const endDate = faker.datatype.boolean(0.3) ? faker.date.future({ years: 2 }).toISOString() : null;

    return {
      frequency,
      interval,
      nextOccurrenceDate,
      endDate,
    } satisfies NewRecurrence;
  },
});

// enhanced seeding functions with indonesian context
const seedGroups = async (): Promise<{ id: number; name: string; defaultCurrency: string }[]> => {
  console.log('🏢 seeding groups...');

  const groupsData: NewGroup[] = Array.from({ length: SEED_CONFIG.groups }, () => ({
    name: faker.company.name(),
    defaultCurrency: 'IDR', // default to indonesian rupiah
  }));

  const insertedGroups = await db.insert(groups).values(groupsData).returning({
    id: groups.id,
    name: groups.name,
    defaultCurrency: groups.defaultCurrency,
  });

  console.log(`✅ created ${insertedGroups.length} groups`);
  return insertedGroups;
};

const seedUsers = async (groupList: { id: number }[]): Promise<{ id: number; groupId: number }[]> => {
  console.log('👥 seeding users...');

  const usersData: NewUser[] = [];

  for (const group of groupList) {
    const userGenerator = generateUserData(group.id);

    for (let i = 0; i < SEED_CONFIG.usersPerGroup; i++) {
      const user = await userGenerator.generateUser();
      usersData.push(user);
    }
  }

  const insertedUsers = await db.insert(users).values(usersData).returning({
    id: users.id,
    groupId: users.groupId,
  });

  console.log(`✅ created ${insertedUsers.length} users`);
  return insertedUsers;
};

const seedAccounts = async (groupList: { id: number }[]): Promise<{ id: number; groupId: number }[]> => {
  console.log('🏦 seeding accounts...');

  const accountsData: NewAccount[] = [];

  for (const group of groupList) {
    const accountGenerator = generateAccountData(group.id);

    for (let i = 0; i < SEED_CONFIG.accountsPerGroup; i++) {
      const account = accountGenerator.generateAccount();
      accountsData.push(account);
    }
  }

  const insertedAccounts = await db.insert(accounts).values(accountsData).returning({
    id: accounts.id,
    groupId: accounts.groupId,
  });

  console.log(`✅ created ${insertedAccounts.length} accounts`);
  return insertedAccounts;
};

const seedCategories = async (groupList: { id: number }[]): Promise<{ id: number; groupId: number }[]> => {
  console.log('📂 seeding categories...');

  const categoriesData: NewCategory[] = [];

  for (const group of groupList) {
    const categoryGenerator = generateCategoryData(group.id);

    // create indonesian parent categories first
    const parentCategories = ['pengeluaran', 'pemasukan', 'transfer'] as const; // indonesian terms
    for (const parentName of parentCategories) {
      const parentCategory = categoryGenerator.generateParentCategory(parentName);
      categoriesData.push(parentCategory);
    }

    // create expense subcategories
    for (const categoryName of EXPENSE_CATEGORIES) {
      const expenseCategory = categoryGenerator.generateExpenseCategory(categoryName);
      categoriesData.push(expenseCategory);
    }

    // create income subcategories
    for (const categoryName of INCOME_CATEGORIES) {
      const incomeCategory = categoryGenerator.generateIncomeCategory(categoryName);
      categoriesData.push(incomeCategory);
    }
  }

  const insertedCategories = await db.insert(categories).values(categoriesData).returning({
    id: categories.id,
    groupId: categories.groupId,
  });

  console.log(`✅ created ${insertedCategories.length} categories`);
  return insertedCategories;
};

const seedRecurrences = async (): Promise<{ id: number }[]> => {
  console.log('🔄 seeding recurrences...');

  const recurrenceGenerator = generateRecurrenceData();
  const recurrencesData: NewRecurrence[] = Array.from({ length: SEED_CONFIG.recurrences }, () =>
    recurrenceGenerator.generateRecurrence()
  );

  const insertedRecurrences = await db.insert(recurrences).values(recurrencesData).returning({
    id: recurrences.id,
  });

  console.log(`✅ created ${insertedRecurrences.length} recurrences`);
  return insertedRecurrences;
};

const seedTransactions = async (
  accountList: { id: number; groupId: number }[],
  categoryList: { id: number; groupId: number }[],
  userList: { id: number; groupId: number }[],
  recurrenceList: { id: number }[]
): Promise<void> => {
  console.log('💳 seeding transactions...');

  const transactionsData: NewTransaction[] = [];

  for (const account of accountList) {
    const accountCategories = categoryList.filter((cat) => cat.groupId === account.groupId);
    const accountUsers = userList.filter((user) => user.groupId === account.groupId);

    if (accountCategories.length === 0 || accountUsers.length === 0) continue;

    for (let i = 0; i < SEED_CONFIG.transactionsPerAccount; i++) {
      const category = faker.helpers.arrayElement(accountCategories);
      const user = faker.helpers.arrayElement(accountUsers);
      const recurrence = faker.datatype.boolean(0.1) ? faker.helpers.arrayElement(recurrenceList) : null;

      const transactionGenerator = generateTransactionData({
        groupId: account.groupId,
        accountId: account.id,
        categoryId: category.id,
        userId: user.id,
        recurrenceId: recurrence?.id,
      });

      const transaction = transactionGenerator.generateTransaction();
      transactionsData.push(transaction);
    }
  }

  // insert in batches to avoid memory issues
  let totalInserted = 0;

  for (let i = 0; i < transactionsData.length; i += SEED_CONFIG.batchSize) {
    const batch = transactionsData.slice(i, i + SEED_CONFIG.batchSize);
    await db.insert(transactions).values(batch);
    totalInserted += batch.length;
    console.log(`  📝 inserted ${totalInserted}/${transactionsData.length} transactions`);
  }

  console.log(`✅ created ${totalInserted} transactions`);
};

const seedAccountLimits = async (accountList: { id: number; groupId: number }[]): Promise<void> => {
  console.log('⚖️ seeding account limits...');

  const limitsData: NewAccountLimit[] = [];

  for (const account of accountList) {
    if (faker.datatype.boolean(SEED_CONFIG.accountLimitsPerAccount)) {
      const period = faker.helpers.arrayElement(LIMIT_PERIODS);
      const limit = faker.number.float({ min: 500, max: 5000, fractionDigits: 2 });

      limitsData.push({
        accountId: account.id,
        period,
        limit,
      } satisfies NewAccountLimit);
    }
  }

  if (limitsData.length > 0) {
    await db.insert(accountLimits).values(limitsData);
  }

  console.log(`✅ created ${limitsData.length} account limits`);
};

const seedUserPreferences = async (userList: { id: number; groupId: number }[]): Promise<void> => {
  console.log('⚙️ seeding user preferences...');

  const preferencesData: NewUserPreference[] = userList.map(
    (user) =>
      ({
        userId: user.id,
        monthlyStartDate: faker.number.int({ min: 1, max: 28 }),
        weeklyStartDay: faker.number.int({ min: 0, max: 6 }),
        limitPeriod: faker.helpers.arrayElement(PREFERENCE_PERIODS),
        categoryPeriod: faker.helpers.arrayElement(PREFERENCE_PERIODS),
      }) satisfies NewUserPreference
  );

  await db.insert(userPreferences).values(preferencesData);
  console.log(`✅ created ${preferencesData.length} user preferences`);
};

// enhanced seeding orchestrator with better error handling and type safety
const runSeeder = async (): Promise<void> => {
  console.log('🌱 starting development database seeding...');
  console.log('📊 seeding configuration:', SEED_CONFIG);

  try {
    // environment validation with enhanced security checks
    if (process.env.API_STAGE !== 'development') {
      throw new Error('❌ seeding is only allowed in development environment');
    }

    // clear existing data (development only!)
    console.log('🗑️ clearing existing data...');
    const deleteOperations = [
      () => db.delete(userPreferences),
      () => db.delete(accountLimits),
      () => db.delete(transactions),
      () => db.delete(recurrences),
      () => db.delete(categories),
      () => db.delete(accounts),
      () => db.delete(users),
      () => db.delete(groups),
    ] as const;

    for (const operation of deleteOperations) {
      await operation();
    }
    console.log('✅ cleared existing data');

    // seed in dependency order with proper error handling
    const groupList = await seedGroups();
    const userList = await seedUsers(groupList);
    const accountList = await seedAccounts(groupList);
    const categoryList = await seedCategories(groupList);
    const recurrenceList = await seedRecurrences();

    await seedTransactions(accountList, categoryList, userList, recurrenceList);
    await seedAccountLimits(accountList);
    await seedUserPreferences(userList);

    // seeding completion summary
    const summary = {
      groups: groupList.length,
      users: userList.length,
      accounts: accountList.length,
      categories: categoryList.length,
      recurrences: recurrenceList.length,
      estimatedTransactions: accountList.length * SEED_CONFIG.transactionsPerAccount,
    } as const satisfies Record<string, number>;

    console.log('🎉 database seeding completed successfully!');
    console.log('📊 seeding summary:', summary);
    console.log('🔑 default password for all users:', SEED_CONFIG.defaultPassword);
    console.log('💰 primary currency: IDR (Indonesian Rupiah)');
    console.log('🌏 localization: Indonesian context with local banks and transaction patterns');
  } catch (error) {
    console.error('❌ seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// run the seeder if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  void runSeeder();
}

export { runSeeder };
