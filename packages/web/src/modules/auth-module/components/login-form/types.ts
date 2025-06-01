export type LoginFormValues = {
  email: string;
  password: string;
};

export interface LoginFormProps {
  onSuccess?: () => void;
  className?: string;
}
