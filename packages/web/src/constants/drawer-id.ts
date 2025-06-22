export const DRAWER_IDS = {
  CREATE_TRANSACTION: 'create-transaction',
  EDIT_TRANSACTION: 'edit-transaction',
  FILTER_TRANSACTION: 'filter-transaction',
  ADD_ACCOUNT: 'add-account',
  EDIT_ACCOUNT: 'edit-account',
  ADD_CATEGORY: 'add-category',
  EDIT_CATEGORY: 'edit-category',
} as const;

export type DrawerId = (typeof DRAWER_IDS)[keyof typeof DRAWER_IDS];

export const DRAWER_METADATA_KEYS = {
  // for create transaction drawer
  DATE: 'date',

  DRAWER_ID: 'drawerId',
  ACCOUNT_ID: 'accountId',
  CATEGORY_ID: 'categoryId',
  TRANSACTION_ID: 'transactionId',
};
