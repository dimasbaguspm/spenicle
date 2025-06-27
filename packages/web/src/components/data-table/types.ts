export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  field: keyof T;
  direction: SortDirection;
}

export interface ColumnDefinition<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  gridColumn?: string; // CSS Grid column span (e.g., 'span 2')
  render?: (value: T[keyof T], row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  sortConfig?: SortConfig<T>;
  onSort?: (field: keyof T) => void;
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  loading?: boolean;
}
