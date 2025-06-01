import type { NewCategory } from '../../../../types/api';

export interface AddCategoryFormData extends NewCategory {
  metadata?: {
    icon?: string;
    color?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
}

export interface AddCategoryDrawerProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}
