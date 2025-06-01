export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  groupName: string;
  defaultCurrency: string;
}

export interface RegisterStep {
  id: number;
  title: string;
  description: string;
  fields: (keyof RegisterFormData)[];
}

export interface RegisterFormProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}
