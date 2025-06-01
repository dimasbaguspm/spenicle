import type { Account } from '../../../../types/api';

export interface AccountListProps {
  accounts: Account[];
  isLoading?: boolean;
}

export interface AccountItemProps {
  account: Account;
  isDeleting?: boolean;
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
}

export interface AccountListHeaderProps {
  title?: string;
  description?: string;
  showAddButton?: boolean;
}
