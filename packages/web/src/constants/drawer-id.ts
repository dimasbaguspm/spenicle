export const DRAWER_IDS = {
  CREATE_TRANSACTION: 'create-transaction',
  EDIT_TRANSACTION: 'edit-transaction',
  ADD_ACCOUNT: 'add-account',
  EDIT_ACCOUNT: 'edit-account',
  ADD_CATEGORY: 'add-category',
  EDIT_CATEGORY: 'edit-category',
} as const;

export type DrawerId = (typeof DRAWER_IDS)[keyof typeof DRAWER_IDS];
