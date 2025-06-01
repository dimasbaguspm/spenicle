import type { UpdateCategory, Category } from '../../../../types/api';

export interface EditCategoryFormData extends UpdateCategory {
  name: string;
  note?: string | null;
  parentId?: number | null;
  metadata?: {
    icon?: string;
    color?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
}

export interface EditCategoryDrawerProps {
  category: Category;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}
